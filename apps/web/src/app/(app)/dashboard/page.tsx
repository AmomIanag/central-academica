"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { useAcademicQuery } from "@/hooks/use-academic-query";
import { formatAverage, formatDate } from "@/lib/format";
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
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
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
        <>
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
        </>
      )}
    </div>
  );
}
