"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TaskForm } from "@/components/tasks/task-form";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { useAcademicQuery } from "@/hooks/use-academic-query";
import { ApiError, errorMessage } from "@/lib/api";
import { createTask } from "@/lib/tasks-api";
import type { EnrollmentOption, TaskWritePayload } from "@/lib/tasks";

export default function NovaTarefaPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useAcademicQuery<{ disciplines: EnrollmentOption[] }>(
    "/me/tasks/options",
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(payload: TaskWritePayload) {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const created = await createTask(payload);
      router.replace(`/tarefas/${created.id}`);
    } catch (caught) {
      setFormError(
        caught instanceof ApiError && caught.code === "NOT_FOUND"
          ? "Disciplina não encontrada na sua matrícula."
          : errorMessage(caught),
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return <PageLoading />;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl">
        {error ? <ErrorState message={error} onRetry={reload} /> : <EmptyState title="Não foi possível carregar o formulário." />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/tarefas" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        Tarefas
      </Link>
      <section>
        <h2 className="text-xl font-semibold tracking-tight">Nova tarefa</h2>
        <p className="mt-1 text-sm text-muted">O título é obrigatório. Disciplina e prazo são opcionais.</p>
      </section>
      <TaskForm
        disciplines={data.disciplines}
        submitting={submitting}
        submitLabel="Criar tarefa"
        error={formError}
        onSubmit={(payload) => onSubmit(payload as TaskWritePayload)}
      />
    </div>
  );
}
