"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { useAcademicQuery } from "@/hooks/use-academic-query";
import { formatAverage } from "@/lib/format";
import type { DisciplineSummary } from "@/lib/types";

export default function NotasPage() {
  const router = useRouter();
  const { data, error, loading, reload } =
    useAcademicQuery<DisciplineSummary[]>("/me/disciplines");

  if (loading) {
    return <PageLoading />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <EmptyState
          title="Nenhuma disciplina no período atual"
          description="Suas disciplinas aparecerão aqui quando houver um período letivo ativo."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-4 text-sm text-muted">{data.length} disciplinas no período atual</p>

      <div className="space-y-2 md:hidden">
        {data.map((discipline) => (
          <Link key={discipline.id} href={`/notas/${discipline.id}`}>
            <Card className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted">{discipline.code}</p>
                  <p className="mt-0.5 truncate text-sm font-medium">{discipline.name}</p>
                  <p className="mt-1 truncate text-xs text-muted">{discipline.professor.name}</p>
                </div>
                <StatusBadge status={discipline.status} />
              </div>
              <p className="mt-3 text-lg font-semibold tabular-nums">
                {formatAverage(discipline.average)}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Código</th>
              <th className="px-4 py-2.5 font-medium">Disciplina</th>
              <th className="px-4 py-2.5 font-medium">Professor</th>
              <th className="px-4 py-2.5 font-medium">Média</th>
              <th className="px-4 py-2.5 font-medium">Situação</th>
              <th className="px-4 py-2.5 font-medium">
                <span className="sr-only">Abrir</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((discipline) => (
              <tr
                key={discipline.id}
                className="cursor-pointer hover:bg-surface-hover"
                onClick={() => router.push(`/notas/${discipline.id}`)}
              >
                <td className="px-4 py-2.5 font-medium tabular-nums">{discipline.code}</td>
                <td className="px-4 py-2.5">{discipline.name}</td>
                <td className="px-4 py-2.5 text-muted">{discipline.professor.name}</td>
                <td className="px-4 py-2.5 tabular-nums">{formatAverage(discipline.average)}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={discipline.status} />
                </td>
                <td className="px-4 py-2.5 text-right text-muted">
                  <ChevronRight className="inline h-4 w-4" />
                  <span className="sr-only">Abrir {discipline.name}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
