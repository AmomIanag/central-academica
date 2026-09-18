"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { useAcademicQuery } from "@/hooks/use-academic-query";
import { ApiError, errorMessage } from "@/lib/api";
import { browserTimeZone } from "@/lib/datetime";
import { completeTask, deleteTask, getTaskOptions, patchTask, reopenTask } from "@/lib/tasks-api";
import type { EnrollmentOption, Task, TaskPatchPayload } from "@/lib/tasks";

export default function TarefaDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : null;
  const { data, error, errorCode, loading, reload } = useAcademicQuery<Task>(
    id ? `/me/tasks/${id}?timeZone=${encodeURIComponent(browserTimeZone())}` : null,
  );
  const [disciplines, setDisciplines] = useState<EnrollmentOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getTaskOptions()
      .then((result) => {
        if (!cancelled) {
          setDisciplines(result.disciplines);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisciplines([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(payload: TaskPatchPayload) {
    if (!id || submitting) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await patchTask(id, payload);
      reload();
      setSubmitting(false);
    } catch (caught) {
      setFormError(
        caught instanceof ApiError && caught.code === "NOT_FOUND"
          ? "Disciplina não encontrada na sua matrícula."
          : errorMessage(caught),
      );
      setSubmitting(false);
    }
  }

  async function onToggle() {
    if (!data || toggling) {
      return;
    }

    setToggling(true);
    setActionError(null);

    try {
      if (data.status === "completed") {
        await reopenTask(data.id);
      } else {
        await completeTask(data.id);
      }
      reload();
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setToggling(false);
    }
  }

  async function onDelete() {
    if (!id || deleting) {
      return;
    }

    setDeleting(true);
    setActionError(null);

    try {
      await deleteTask(id);
      router.replace("/tarefas");
    } catch (caught) {
      setActionError(errorMessage(caught));
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  if (loading) {
    return <PageLoading />;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <BackLink />
        {errorCode === "NOT_FOUND" || errorCode === "VALIDATION_ERROR" ? (
          <EmptyState
            title="Tarefa não encontrada"
            description="Ela pode ter sido excluída ou não pertence à sua conta."
          />
        ) : (
          <ErrorState message={error ?? "Não foi possível carregar a tarefa."} onRetry={reload} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <BackLink />
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{data.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {data.status === "completed" ? "Concluída" : "Pendente"}
            {data.overdue ? " · atrasada" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void onToggle()} disabled={toggling} aria-busy={toggling}>
            {data.status === "completed" ? "Reabrir" : "Concluir"}
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Excluir
          </Button>
        </div>
      </section>

      {actionError ? (
        <p className="text-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {submitting ? "Salvando tarefa" : ""}
      </p>

      <TaskForm
        task={data}
        disciplines={disciplines}
        submitting={submitting}
        submitLabel="Salvar alterações"
        error={formError}
        onSubmit={(payload) => onSubmit(payload)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir tarefa?"
        description="Esta ação não pode ser desfeita. A tarefa será removida definitivamente."
        confirmLabel="Excluir"
        busy={deleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/tarefas" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      Tarefas
    </Link>
  );
}
