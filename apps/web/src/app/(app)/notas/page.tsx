"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { useAcademicQuery } from "@/hooks/use-academic-query";
import { ApiError, errorMessage } from "@/lib/api";
import { deleteDiscipline } from "@/lib/academic-api";
import { formatAverage, formatPercent } from "@/lib/format";
import type { DisciplineSummary } from "@/lib/types";

export default function NotasPage() {
  const { data, error, loading, reload } = useAcademicQuery<DisciplineSummary[]>("/me/disciplines");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function onDelete() {
    if (!pendingId || deleting) {
      return;
    }

    setDeleting(true);
    setActionError(null);

    try {
      await deleteDiscipline(pendingId);
      setPendingId(null);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError && caught.code === "CONFLICT"
          ? "Existem tarefas vinculadas a esta disciplina. Desvincule ou exclua as tarefas antes de remover."
          : errorMessage(caught),
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <PageLoading />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  const pending = data?.find((item) => item.id === pendingId) ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {data && data.length > 0
            ? `${data.length} disciplinas no ano letivo atual`
            : "Nenhuma disciplina no ano letivo atual"}
        </p>
        <Link
          href="/notas/nova"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nova disciplina
        </Link>
      </div>

      {actionError ? (
        <p className="text-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}

      {!data || data.length === 0 ? (
        <EmptyState
          title="Nenhuma disciplina cadastrada"
          description="Crie uma disciplina para lançar notas, presença e acompanhar a média anual."
        />
      ) : (
        <>
          <div className="space-y-2 lg:hidden">
            {data.map((discipline) => (
              <Card key={discipline.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{discipline.name}</p>
                    <p className="mt-1 truncate text-xs text-muted">{discipline.professor.name}</p>
                  </div>
                  <StatusBadge status={discipline.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-muted">MD1</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{formatAverage(discipline.semester1.md)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">MD2</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{formatAverage(discipline.semester2.md)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">MP</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{formatAverage(discipline.mp)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Presença</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">
                      {formatPercent(discipline.attendance.percentage)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/notas/${discipline.id}`}
                    className="inline-flex h-8 items-center rounded-md border border-border px-2.5 text-xs hover:bg-surface-hover"
                  >
                    Abrir
                  </Link>
                  <Link
                    href={`/notas/${discipline.id}/editar`}
                    className="inline-flex h-8 items-center rounded-md border border-border px-2.5 text-xs hover:bg-surface-hover"
                  >
                    Editar
                  </Link>
                  <Button
                    variant="ghost"
                    className="h-8 px-2.5 text-xs text-danger hover:text-danger"
                    onClick={() => {
                      setActionError(null);
                      setPendingId(discipline.id);
                    }}
                  >
                    Remover
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Disciplinas do ano letivo atual</caption>
              <thead className="border-b border-border text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Disciplina
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Professor
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    MD1
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    MD2
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    MP
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Situação
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Presença
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((discipline) => (
                  <tr key={discipline.id} className="hover:bg-surface-hover">
                    <td className="px-4 py-2.5">
                      <Link href={`/notas/${discipline.id}`} className="font-medium hover:text-accent">
                        {discipline.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{discipline.professor.name}</td>
                    <td className="px-4 py-2.5 tabular-nums">{formatAverage(discipline.semester1.md)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{formatAverage(discipline.semester2.md)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{formatAverage(discipline.mp)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={discipline.status} />
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatPercent(discipline.attendance.percentage)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/notas/${discipline.id}`}
                          aria-label={`Abrir ${discipline.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-background hover:text-foreground"
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                        <Link
                          href={`/notas/${discipline.id}/editar`}
                          aria-label={`Editar ${discipline.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-background hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 px-0 text-muted hover:text-danger"
                          aria-label={`Remover ${discipline.name}`}
                          onClick={() => {
                            setActionError(null);
                            setPendingId(discipline.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Remover disciplina?"
        description={
          pending
            ? `A disciplina ${pending.name} será removida com notas e presença. Tarefas vinculadas bloqueiam a exclusão.`
            : ""
        }
        confirmLabel="Remover"
        busy={deleting}
        onConfirm={() => void onDelete()}
        onCancel={() => {
          if (!deleting) {
            setPendingId(null);
          }
        }}
      />
    </div>
  );
}
