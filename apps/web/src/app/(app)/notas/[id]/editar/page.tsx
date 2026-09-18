"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DisciplineForm } from "@/components/academic/discipline-form";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { useAcademicQuery } from "@/hooks/use-academic-query";
import { ApiError, errorMessage } from "@/lib/api";
import { patchDiscipline } from "@/lib/academic-api";
import type { DisciplineDetail } from "@/lib/types";

export default function EditarDisciplinaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : null;
  const { data, error, errorCode, loading } = useAcademicQuery<DisciplineDetail>(
    id ? `/me/disciplines/${id}` : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(payload: { name: string; professorName: string }) {
    if (!id || submitting) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await patchDiscipline(id, payload);
      router.replace(`/notas/${id}`);
    } catch (caught) {
      setFormError(caught instanceof ApiError ? errorMessage(caught) : errorMessage(caught));
      setSubmitting(false);
    }
  }

  if (loading) {
    return <PageLoading />;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/notas" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          Disciplinas
        </Link>
        {errorCode === "NOT_FOUND" || errorCode === "VALIDATION_ERROR" ? (
          <EmptyState title="Disciplina não encontrada" />
        ) : (
          <ErrorState message={error ?? "Não foi possível carregar a disciplina."} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href={`/notas/${data.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        {data.name}
      </Link>
      <section>
        <h2 className="text-xl font-semibold tracking-tight">Editar disciplina</h2>
        <p className="mt-1 text-sm text-muted">Altere o nome ou o professor desta disciplina.</p>
      </section>
      <DisciplineForm
        initialName={data.name}
        initialProfessorName={data.professor.name}
        submitting={submitting}
        submitLabel="Salvar alterações"
        error={formError}
        onSubmit={onSubmit}
      />
    </div>
  );
}
