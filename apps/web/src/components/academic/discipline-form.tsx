"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/feedback";

export function DisciplineForm({
  initialName = "",
  initialProfessorName = "",
  submitting,
  submitLabel,
  error,
  onSubmit,
}: {
  initialName?: string;
  initialProfessorName?: string;
  submitting: boolean;
  submitLabel: string;
  error?: string | null;
  onSubmit: (payload: { name: string; professorName: string }) => Promise<void> | void;
}) {
  const [name, setName] = useState(initialName);
  const [professorName, setProfessorName] = useState(initialProfessorName);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; professorName?: string }>({});

  useEffect(() => {
    setName(initialName);
    setProfessorName(initialProfessorName);
  }, [initialName, initialProfessorName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: { name?: string; professorName?: string } = {};
    const trimmedName = name.trim();
    const trimmedProfessor = professorName.trim();

    if (trimmedName.length === 0) {
      nextErrors.name = "Informe o nome da disciplina.";
    }

    if (trimmedProfessor.length === 0) {
      nextErrors.professorName = "Informe o professor.";
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(nextErrors.name ? "discipline-name" : "professor-name")?.focus();
      return;
    }

    await onSubmit({ name: trimmedName, professorName: trimmedProfessor });
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
      <div>
        <label className="block text-xs font-medium text-muted" htmlFor="discipline-name">
          Disciplina
        </label>
        <Input
          id="discipline-name"
          className="mt-1.5"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={160}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? "discipline-name-error" : undefined}
        />
        {fieldErrors.name ? (
          <p id="discipline-name-error" className="mt-1 text-xs text-danger">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-xs font-medium text-muted" htmlFor="professor-name">
          Professor
        </label>
        <Input
          id="professor-name"
          className="mt-1.5"
          name="professorName"
          value={professorName}
          onChange={(event) => setProfessorName(event.target.value)}
          required
          maxLength={120}
          aria-invalid={fieldErrors.professorName ? true : undefined}
          aria-describedby={fieldErrors.professorName ? "professor-name-error" : undefined}
        />
        {fieldErrors.professorName ? (
          <p id="professor-name-error" className="mt-1 text-xs text-danger">
            {fieldErrors.professorName}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} aria-busy={submitting}>
        {submitting ? <Spinner className="h-4 w-4" /> : null}
        {submitting ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
