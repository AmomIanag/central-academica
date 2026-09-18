"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, PageLoading, Spinner } from "@/components/ui/feedback";
import { useAcademicQuery } from "@/hooks/use-academic-query";
import { ApiError, errorMessage } from "@/lib/api";
import { deleteDiscipline, patchDisciplineAttendance, patchDisciplineGrade } from "@/lib/academic-api";
import { formatAverage, formatPercent, formatScore } from "@/lib/format";
import type { AcademicSemester, AssessmentKind, DisciplineDetail } from "@/lib/types";

function scoreToInput(value: number | null): string {
  return value === null ? "" : String(value);
}

function parseScore(value: string): number | "invalid" | null {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return "invalid";
  }

  return parsed;
}

export default function DisciplinePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : null;
  const { data, error, errorCode, loading, reload } = useAcademicQuery<DisciplineDetail>(
    id ? `/me/disciplines/${id}` : null,
  );
  const [cp1, setCp1] = useState("");
  const [gs1, setGs1] = useState("");
  const [cp2, setCp2] = useState("");
  const [gs2, setGs2] = useState("");
  const [totalClasses, setTotalClasses] = useState("0");
  const [absences, setAbsences] = useState("0");
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  useEffect(() => {
    if (!data) {
      return;
    }

    setCp1(scoreToInput(data.semester1.cp));
    setGs1(scoreToInput(data.semester1.gs));
    setCp2(scoreToInput(data.semester2.cp));
    setGs2(scoreToInput(data.semester2.gs));
    setTotalClasses(String(data.attendance.totalClasses));
    setAbsences(String(data.attendance.absences));
  }, [data]);

  async function saveSlot(
    semester: AcademicSemester,
    kind: AssessmentKind,
    raw: string,
    clear = false,
  ) {
    if (!id || savingSlot) {
      return;
    }

    const score = clear ? null : parseScore(raw);

    if (score === "invalid") {
      setFormError("A nota deve estar entre 0 e 100.");
      return;
    }

    setSavingSlot(`${semester}-${kind}`);
    setFormError(null);

    try {
      const updated = await patchDisciplineGrade(id, { semester, kind, score });
      setLiveMessage(
        `Notas atualizadas. Situação: ${updated.status === "EM_ANDAMENTO" ? "em andamento" : updated.status.toLowerCase().replaceAll("_", " ")}.`,
      );
      reload();
    } catch (caught) {
      setFormError(errorMessage(caught));
    } finally {
      setSavingSlot(null);
    }
  }

  async function saveAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id || savingAttendance) {
      return;
    }

    const classes = Number(totalClasses);
    const missed = Number(absences);

    if (!Number.isInteger(classes) || classes < 0 || !Number.isInteger(missed) || missed < 0) {
      setFormError("Aulas e faltas devem ser números inteiros maiores ou iguais a zero.");
      return;
    }

    if (missed > classes) {
      setFormError("O número de faltas não pode ser maior que o total de aulas.");
      return;
    }

    setSavingAttendance(true);
    setFormError(null);

    try {
      await patchDisciplineAttendance(id, { totalClasses: classes, absences: missed });
      setLiveMessage("Presença atualizada.");
      reload();
    } catch (caught) {
      setFormError(errorMessage(caught));
    } finally {
      setSavingAttendance(false);
    }
  }

  async function onDelete() {
    if (!id || deleting) {
      return;
    }

    setDeleting(true);
    setFormError(null);

    try {
      await deleteDiscipline(id);
      router.replace("/notas");
    } catch (caught) {
      setFormError(
        caught instanceof ApiError && caught.code === "CONFLICT"
          ? "Existem tarefas vinculadas a esta disciplina. Desvincule ou exclua as tarefas antes de remover."
          : errorMessage(caught),
      );
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

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
            description="Ela pode não existir ou não pertencer ao ano letivo atual."
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
          <h2 className="text-xl font-semibold tracking-tight">{data.name}</h2>
          <p className="mt-1 text-sm text-muted">Professor: {data.professor.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          <Link
            href={`/notas/${data.id}/editar`}
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-surface-hover"
          >
            Editar
          </Link>
          <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmOpen(true)}>
            Remover
          </Button>
        </div>
      </section>

      <p className="sr-only" aria-live="polite">
        {liveMessage}
      </p>

      {formError ? (
        <p className="text-sm text-danger" role="alert">
          {formError}
        </p>
      ) : null}

      <Card className="px-4 py-4">
        <h3 className="text-sm font-medium">Presença</h3>
        <form onSubmit={(event) => void saveAttendance(event)} className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-muted" htmlFor="total-classes">
              Aulas
            </label>
            <Input
              id="total-classes"
              className="mt-1.5"
              inputMode="numeric"
              value={totalClasses}
              onChange={(event) => setTotalClasses(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted" htmlFor="absences">
              Faltas
            </label>
            <Input
              id="absences"
              className="mt-1.5"
              inputMode="numeric"
              value={absences}
              onChange={(event) => setAbsences(event.target.value)}
            />
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-xs text-muted">Presença</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatPercent(data.attendance.percentage)}</p>
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" variant="secondary" disabled={savingAttendance} aria-busy={savingAttendance}>
              {savingAttendance ? <Spinner className="h-4 w-4" /> : null}
              Salvar presença
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <SemesterCard
          title="1º semestre"
          semester={1}
          mdLabel="MD1"
          md={data.semester1.md}
          cp={cp1}
          gs={gs1}
          onCpChange={setCp1}
          onGsChange={setGs1}
          saving={savingSlot}
          onSave={(kind, raw) => void saveSlot(1, kind, raw)}
          onClear={(kind) => void saveSlot(1, kind, "", true)}
        />
        <SemesterCard
          title="2º semestre"
          semester={2}
          mdLabel="MD2"
          md={data.semester2.md}
          cp={cp2}
          gs={gs2}
          onCpChange={setCp2}
          onGsChange={setGs2}
          saving={savingSlot}
          onSave={(kind, raw) => void saveSlot(2, kind, raw)}
          onClear={(kind) => void saveSlot(2, kind, "", true)}
        />
      </div>

      <Card className="px-4 py-4">
        <h3 className="text-sm font-medium">Resultado anual</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">MP</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{formatAverage(data.mp)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Situação</dt>
            <dd className="mt-2">
              <StatusBadge status={data.status} />
            </dd>
          </div>
        </dl>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Remover disciplina?"
        description={`A disciplina ${data.name} será removida com notas e presença. Tarefas vinculadas bloqueiam a exclusão.`}
        confirmLabel="Remover"
        busy={deleting}
        onConfirm={() => void onDelete()}
        onCancel={() => {
          if (!deleting) {
            setConfirmOpen(false);
          }
        }}
      />
    </div>
  );
}

function SemesterCard({
  title,
  semester,
  mdLabel,
  md,
  cp,
  gs,
  onCpChange,
  onGsChange,
  saving,
  onSave,
  onClear,
}: {
  title: string;
  semester: AcademicSemester;
  mdLabel: string;
  md: number | null;
  cp: string;
  gs: string;
  onCpChange: (value: string) => void;
  onGsChange: (value: string) => void;
  saving: string | null;
  onSave: (kind: AssessmentKind, raw: string) => void;
  onClear: (kind: AssessmentKind) => void;
}) {
  return (
    <Card className="px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted">
          {mdLabel}: <span className="font-semibold tabular-nums text-foreground">{formatScore(md)}</span>
        </p>
      </div>
      <GradeField
        idPrefix={`${title}-cp`}
        label="CP"
        value={cp}
        disabled={saving !== null}
        busy={saving === `${semester}-CP`}
        onChange={onCpChange}
        onSave={() => onSave("CP", cp)}
        onClear={() => onClear("CP")}
      />
      <GradeField
        idPrefix={`${title}-gs`}
        label="GS"
        value={gs}
        disabled={saving !== null}
        busy={saving === `${semester}-GS`}
        onChange={onGsChange}
        onSave={() => onSave("GS", gs)}
        onClear={() => onClear("GS")}
      />
    </Card>
  );
}

function GradeField({
  idPrefix,
  label,
  value,
  disabled,
  busy,
  onChange,
  onSave,
  onClear,
}: {
  idPrefix: string;
  label: string;
  value: string;
  disabled: boolean;
  busy: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
}) {
  const fieldId = `${idPrefix}-score`;

  return (
    <div className="mt-3">
      <label className="block text-xs font-medium text-muted" htmlFor={fieldId}>
        {label}
      </label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <Input
          id={fieldId}
          className="max-w-[8rem]"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Nota ${label}`}
        />
        <Button type="button" variant="secondary" disabled={disabled} onClick={onSave} aria-busy={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : null}
          Salvar
        </Button>
        <Button type="button" variant="ghost" disabled={disabled} onClick={onClear}>
          Limpar
        </Button>
      </div>
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
