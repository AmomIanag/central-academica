"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DisciplineForm } from "@/components/academic/discipline-form";
import { ApiError, errorMessage } from "@/lib/api";
import { createDiscipline } from "@/lib/academic-api";

export default function NovaDisciplinaPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(payload: { name: string; professorName: string }) {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const created = await createDiscipline(payload);
      router.replace(`/notas/${created.id}`);
    } catch (caught) {
      setFormError(caught instanceof ApiError ? errorMessage(caught) : errorMessage(caught));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/notas" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        Disciplinas
      </Link>
      <section>
        <h2 className="text-xl font-semibold tracking-tight">Nova disciplina</h2>
        <p className="mt-1 text-sm text-muted">
          Informe o nome e o professor. As notas CP/GS dos dois semestres podem ser lançadas depois.
        </p>
      </section>
      <DisciplineForm submitting={submitting} submitLabel="Criar disciplina" error={formError} onSubmit={onSubmit} />
    </div>
  );
}
