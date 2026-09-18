"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { TaskListItem } from "@/components/tasks/task-list-item";
import { useAcademicQuery } from "@/hooks/use-academic-query";
import { completeTask, reopenTask } from "@/lib/tasks-api";
import { errorMessage } from "@/lib/api";
import { browserTimeZone } from "@/lib/datetime";
import type { EnrollmentOption, Task } from "@/lib/tasks";

function queryPath(params: URLSearchParams): string {
  const search = new URLSearchParams();
  const status = params.get("status");
  const priority = params.get("priority");
  const disciplineId = params.get("disciplina");

  if (status === "pending" || status === "completed") {
    search.set("status", status);
  }

  if (priority === "low" || priority === "normal" || priority === "high") {
    search.set("priority", priority);
  }

  if (disciplineId) {
    search.set("disciplineId", disciplineId);
  }

  search.set("limit", "100");
  search.set("timeZone", browserTimeZone());
  return `/me/tasks?${search.toString()}`;
}

function TarefasList() {
  const searchParams = useSearchParams();
  const path = useMemo(() => queryPath(searchParams), [searchParams]);
  const { data, error, loading, reload } = useAcademicQuery<Task[]>(path);
  const options = useAcademicQuery<{ disciplines: EnrollmentOption[] }>("/me/tasks/options");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function onToggle(task: Task) {
    if (busyId) {
      return;
    }

    setBusyId(task.id);
    setActionError(null);

    try {
      if (task.status === "completed") {
        await reopenTask(task.id);
      } else {
        await completeTask(task.id);
      }
      reload();
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const disciplineId = searchParams.get("disciplina") ?? "";

  if (loading) {
    return <PageLoading />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Organize prazos pessoais e por disciplina.</p>
        <Link
          href="/tarefas/nova"
          className="inline-flex h-9 items-center justify-center rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Nova tarefa
        </Link>
      </div>

      <form className="grid gap-3 sm:grid-cols-3" method="get">
        <div>
          <label className="block text-xs font-medium text-muted" htmlFor="status">
            Situação
          </label>
          <Select id="status" name="status" className="mt-1.5" defaultValue={status}>
            <option value="">Todas</option>
            <option value="pending">Pendentes</option>
            <option value="completed">Concluídas</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted" htmlFor="priority">
            Prioridade
          </label>
          <Select id="priority" name="priority" className="mt-1.5" defaultValue={priority}>
            <option value="">Todas</option>
            <option value="high">Alta</option>
            <option value="normal">Normal</option>
            <option value="low">Baixa</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted" htmlFor="disciplina">
            Disciplina
          </label>
          <Select id="disciplina" name="disciplina" className="mt-1.5" defaultValue={disciplineId}>
            <option value="">Todas</option>
            {(options.data?.disciplines ?? []).map((discipline) => (
              <option key={discipline.id} value={discipline.id}>
                {discipline.code} · {discipline.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-3">
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </div>
      </form>

      {actionError ? (
        <p className="text-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}

      {!data || data.length === 0 ? (
        <EmptyState
          title="Nenhuma tarefa encontrada"
          description="Crie uma tarefa para acompanhar prazos, disciplinas e o que ainda falta fazer."
        />
      ) : (
        <ul className="space-y-2">
          {data.map((task) => (
            <li key={task.id}>
              <TaskListItem task={task} busy={busyId === task.id} onToggle={onToggle} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TarefasPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <TarefasList />
    </Suspense>
  );
}
