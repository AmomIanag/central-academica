"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, PageLoading, Spinner } from "@/components/ui/feedback";
import { useAcademicQuery } from "@/hooks/use-academic-query";
import { formatAverage, formatDate } from "@/lib/format";
import { browserTimeZone } from "@/lib/datetime";
import { formatTaskDue, type TaskSummary } from "@/lib/tasks";
import type { Dashboard } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function DashboardPage() {
  const { data, error, loading, reload } = useAcademicQuery<Dashboard>("/me/dashboard");

  if (loading) {
    return <PageLoading />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (!data) {
    return <EmptyState title="Não foi possível carregar o dashboard." />;
  }

  const stats = [
    { label: "Média geral", value: formatAverage(data.overallAverage) },
    {
      label: "Disciplinas",
      value: String(data.disciplineCount),
      hint: `${data.statusSummary.inProgress} em andamento`,
    },
    {
      label: "Aprovadas",
      value: String(data.statusSummary.approved),
      tone: "success" as const,
    },
    {
      label: "Reprovadas",
      value: String(data.statusSummary.failed),
      tone: "danger" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent-label">
          {data.term?.label ?? "Sem período atual"}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Olá, {data.student.name}</h2>
        <p className="mt-1 text-sm text-muted">
          {[data.student.courseName, data.student.ra].filter(Boolean).join(" · ") || "Aluno"}
        </p>
      </section>

      {!data.term ? (
        <EmptyState
          title="Nenhum período letivo atual"
          description="Quando houver um período ativo, suas disciplinas e médias aparecem aqui."
        />
      ) : (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{stat.label}</p>
              <p
                className={cn(
                  "mt-2 text-2xl font-semibold tracking-tight",
                  stat.tone === "success" && "text-success",
                  stat.tone === "danger" && "text-danger",
                )}
              >
                {stat.value}
              </p>
              {"hint" in stat && stat.hint ? (
                <p className="mt-1 text-xs text-muted">{stat.hint}</p>
              ) : null}
            </Card>
          ))}
        </section>
      )}

      <TasksSummaryCard />

      {data.term ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-medium">Próximas avaliações</h3>
            <Link href="/notas" className="text-xs text-muted hover:text-foreground">
              Ver disciplinas
            </Link>
          </div>

          {data.upcomingAssessments.length === 0 ? (
            <EmptyState
              title="Nenhuma avaliação pendente"
              description="Não há avaliações sem nota com data definida no período atual."
            />
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-border">
                {data.upcomingAssessments.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/notas/${item.discipline.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-hover"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {item.discipline.code} · {item.discipline.name}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted">
                        {formatDate(item.dueOn)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      ) : null}
    </div>
  );
}

function TasksSummaryCard() {
  const { data, error, loading, reload } = useAcademicQuery<TaskSummary>(
    `/me/tasks/summary?timeZone=${encodeURIComponent(browserTimeZone())}`,
  );

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">Tarefas</h3>
        <div className="flex gap-3">
          <Link href="/tarefas" className="text-xs text-muted hover:text-foreground">
            Ver tarefas
          </Link>
          <Link href="/agenda" className="text-xs text-muted hover:text-foreground">
            Agenda
          </Link>
        </div>
      </div>

      {loading ? (
        <Card className="flex items-center gap-2 px-4 py-6 text-sm text-muted" role="status" aria-live="polite">
          <Spinner className="h-4 w-4" />
          Carregando tarefas
        </Card>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <EmptyState title="Não foi possível carregar as tarefas." />
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-2 gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Pendentes</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{data.pendingCount}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Atrasadas</p>
              <p className={cn("mt-1 text-xl font-semibold tabular-nums", data.overdueCount > 0 && "text-danger")}>
                {data.overdueCount}
              </p>
            </div>
          </div>
          {data.upcoming.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Nenhuma tarefa com prazo.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.upcoming.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/tarefas/${task.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-hover"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {task.discipline ? `${task.discipline.code} · ` : ""}
                        {formatTaskDue(task.due)}
                        {task.overdue ? " · atrasada" : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </section>
  );
}
