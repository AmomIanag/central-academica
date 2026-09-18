"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/feedback";
import type { DueKind, EnrollmentOption, Task, TaskPatchPayload, TaskWritePayload } from "@/lib/tasks";
import { dueFromForm, dueToForm, validateTaskForm } from "@/lib/tasks";

type FieldErrors = Partial<Record<"title" | "description" | "date" | "time" | "disciplineId", string>>;

export function TaskForm({
  task,
  disciplines,
  submitting,
  submitLabel,
  onSubmit,
  error,
}: {
  task?: Task;
  disciplines: EnrollmentOption[];
  submitting: boolean;
  submitLabel: string;
  error?: string | null;
  onSubmit: (payload: TaskWritePayload | TaskPatchPayload) => Promise<void> | void;
}) {
  const initial = useMemo(() => dueToForm(task?.due ?? null), [task]);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState(task?.priority ?? "normal");
  const [disciplineId, setDisciplineId] = useState(task?.discipline?.id ?? "");
  const [kind, setKind] = useState<DueKind>(initial.kind);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!task) {
      return;
    }

    const next = dueToForm(task.due);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setDisciplineId(task.discipline?.id ?? "");
    setKind(next.kind);
    setDate(next.date);
    setTime(next.time);
  }, [task]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateTaskForm({ title, description, kind, date, time });
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const first = Object.keys(errors)[0];
      document.getElementById(first)?.focus();
      return;
    }

    const payload: TaskWritePayload = {
      title: title.trim(),
      description: description.trim() === "" ? null : description.trim(),
      priority,
      disciplineId: disciplineId || null,
      due: dueFromForm(kind, date, time),
    };

    await onSubmit(payload);
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
      <div>
        <label className="block text-xs font-medium text-muted" htmlFor="title">
          Título
        </label>
        <Input
          id="title"
          className="mt-1.5"
          name="title"
          value={title}
          maxLength={160}
          required
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-describedby={fieldErrors.title ? "title-error" : undefined}
          onChange={(event) => setTitle(event.target.value)}
        />
        {fieldErrors.title ? (
          <p id="title-error" className="mt-1 text-xs text-danger" role="alert">
            {fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-xs font-medium text-muted" htmlFor="description">
          Descrição
        </label>
        <Textarea
          id="description"
          className="mt-1.5"
          name="description"
          value={description}
          maxLength={4000}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={fieldErrors.description ? "description-error" : undefined}
          onChange={(event) => setDescription(event.target.value)}
        />
        {fieldErrors.description ? (
          <p id="description-error" className="mt-1 text-xs text-danger" role="alert">
            {fieldErrors.description}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-muted" htmlFor="priority">
            Prioridade
          </label>
          <Select
            id="priority"
            className="mt-1.5"
            value={priority}
            onChange={(event) => setPriority(event.target.value as typeof priority)}
          >
            <option value="low">Baixa</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted" htmlFor="disciplineId">
            Disciplina
          </label>
          <Select
            id="disciplineId"
            className="mt-1.5"
            value={disciplineId}
            onChange={(event) => setDisciplineId(event.target.value)}
          >
            <option value="">Nenhuma (pessoal)</option>
            {disciplines.map((discipline) => (
              <option key={discipline.id} value={discipline.id}>
                {discipline.code} · {discipline.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <fieldset>
        <legend className="text-xs font-medium text-muted">Prazo</legend>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {[
            { value: "none", label: "Sem prazo" },
            { value: "date", label: "Somente data" },
            { value: "datetime", label: "Data e horário" },
          ].map((option) => (
            <label key={option.value} className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="due-kind"
                value={option.value}
                checked={kind === option.value}
                onChange={() => setKind(option.value as DueKind)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {kind !== "none" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-muted" htmlFor="date">
              Data
            </label>
            <Input
              id="date"
              className="mt-1.5"
              type="date"
              value={date}
              required
              aria-invalid={fieldErrors.date ? true : undefined}
              aria-describedby={fieldErrors.date ? "date-error" : undefined}
              onChange={(event) => setDate(event.target.value)}
            />
            {fieldErrors.date ? (
              <p id="date-error" className="mt-1 text-xs text-danger" role="alert">
                {fieldErrors.date}
              </p>
            ) : null}
          </div>
          {kind === "datetime" ? (
            <div>
              <label className="block text-xs font-medium text-muted" htmlFor="time">
                Horário
              </label>
              <Input
                id="time"
                className="mt-1.5"
                type="time"
                value={time}
                required
                aria-invalid={fieldErrors.time ? true : undefined}
                aria-describedby={fieldErrors.time ? "time-error" : undefined}
                onChange={(event) => setTime(event.target.value)}
              />
              {fieldErrors.time ? (
                <p id="time-error" className="mt-1 text-xs text-danger" role="alert">
                  {fieldErrors.time}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

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
