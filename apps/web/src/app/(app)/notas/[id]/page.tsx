"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { useAcademicQuery } from "@/hooks/use-academic-query";
import { formatAverage, formatDate, formatScore, formatWeight } from "@/lib/format";
import type { DisciplineDetail } from "@/lib/types";

export default function DisciplinePage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : null;
  const { data, error, errorCode, loading, reload } = useAcademicQuery<DisciplineDetail>(
    id ? `/me/disciplines/${id}` : null,
  );

  if (loading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <BackLink />
        {errorCode === "NOT_FOUND" || errorCode === "VALIDATION_ERROR" ? (
          <EmptyState
            title="Disciplina não encontrada"
            description="Ela pode não existir ou não pertencer ao período atual."
          />
        ) : (
          <ErrorState message={error} onRetry={reload} />
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl">
        <BackLink />
        <EmptyState title="Disciplina não encontrada" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <BackLink />

      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{data.code}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{data.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {data.professor.name} · {data.term.label}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <p className="text-2xl font-semibold tabular-nums">{formatAverage(data.average)}</p>
          <StatusBadge status={data.status} />
        </div>
      </section>

      {data.assessments.length === 0 ? (
        <EmptyState title="Nenhuma avaliação lançada para esta disciplina." />
      ) : (
        <>
          <div className="space-y-2 lg:hidden">
            {data.assessments.map((assessment) => (
              <Card key={assessment.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{assessment.name}</p>
                  <p className="text-sm font-semibold tabular-nums">{formatScore(assessment.score)}</p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Peso {formatWeight(assessment.weight)} · {formatDate(assessment.dueOn)}
                </p>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden lg:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Avaliações da disciplina</caption>
              <thead className="border-b border-border text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Avaliação
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Peso
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Data
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Nota
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.assessments.map((assessment) => (
                  <tr key={assessment.id}>
                    <td className="px-4 py-2.5 font-medium">{assessment.name}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted">
                      {formatWeight(assessment.weight)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted">
                      {formatDate(assessment.dueOn)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{formatScore(assessment.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/notas" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      Disciplinas
    </Link>
  );
}
