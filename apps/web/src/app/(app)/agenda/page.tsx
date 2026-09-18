"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { TaskListItem } from "@/components/tasks/task-list-item";
import { useAcademicQuery } from "@/hooks/use-academic-query";
import { cn } from "@/lib/cn";
import {
  addCivilDays,
  browserTimeZone,
  formatCivilDate,
  formatMonthTitle,
  monthEnd,
  monthGrid,
  monthStart,
  todayCivil,
  weekDates,
  weekdayLabel,
} from "@/lib/datetime";
import { sortTasksForAgenda, taskCivilDate, type Task } from "@/lib/tasks";
import { completeTask, reopenTask } from "@/lib/tasks-api";
import { errorMessage } from "@/lib/api";

type AgendaView = "today" | "week" | "month" | "upcoming" | "undated";

const VIEWS: Array<{ id: AgendaView; label: string }> = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "upcoming", label: "Próximas" },
  { id: "undated", label: "Sem prazo" },
];

function tasksPath(from?: string, to?: string): string {
  const search = new URLSearchParams({
    limit: "100",
    timeZone: browserTimeZone(),
  });

  if (from) search.set("from", from);
  if (to) search.set("to", to);

  return `/me/tasks?${search.toString()}`;
}

export default function AgendaPage() {
  const timeZone = browserTimeZone();
  const today = todayCivil(timeZone);
  const [view, setView] = useState<AgendaView>("today");
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const range = useMemo(() => {
    if (view === "today") {
      return { from: cursor, to: cursor };
    }

    if (view === "week") {
      const days = weekDates(cursor);
      return { from: days[0], to: days[6] };
    }

    if (view === "month") {
      return { from: monthStart(cursor), to: monthEnd(cursor) };
    }

    return { from: undefined, to: undefined };
  }, [cursor, view]);

  const path =
    view === "undated" || view === "upcoming"
      ? `/me/tasks?limit=100&timeZone=${encodeURIComponent(timeZone)}`
      : tasksPath(range.from, range.to);

  const { data, error, loading, reload } = useAcademicQuery<Task[]>(path);

  async function onToggle(task: Task) {
    if (busyId) {
      return;
    }

    setBusyId(task.id);
    setActionError(null);

    try {
      if (task.status === "completed") {
        await reopenTask(task.id);
      } else {
        await completeTask(task.id);
      }
      reload();
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  function shift(direction: -1 | 1) {
    if (view === "today") {
      setCursor((current) => addCivilDays(current, direction));
      setSelected((current) => addCivilDays(current, direction));
      return;
    }

    if (view === "week") {
      setCursor((current) => addCivilDays(current, direction * 7));
      return;
    }

    if (view === "month") {
      const start = monthStart(cursor);
      const [year, month] = start.split("-").map(Number);
      const next = new Date(Date.UTC(year, (month ?? 1) - 1 + direction, 1));
      setCursor(next.toISOString().slice(0, 10));
    }
  }

  const tasks = useMemo(() => sortTasksForAgenda(data ?? [], timeZone), [data, timeZone]);
  const undated = tasks.filter((task) => task.due === null);
  const dated = tasks.filter((task) => task.due !== null);
  const upcoming = dated.filter((task) => task.status === "pending");
  const selectedTasks = dated.filter((task) => taskCivilDate(task, timeZone) === selected);
  const week = weekDates(cursor);
  const grid = monthGrid(cursor);
  const counts = new Map<string, number>();

  for (const task of dated) {
    const date = taskCivilDate(task, timeZone);
    if (date) {
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }
  }

  const heading =
    view === "today"
      ? formatCivilDate(cursor)
      : view === "week"
        ? `${formatCivilDate(week[0] ?? cursor)} – ${formatCivilDate(week[6] ?? cursor)}`
        : view === "month"
          ? formatMonthTitle(cursor)
          : view === "upcoming"
            ? "Próximas tarefas"
            : "Tarefas sem prazo";

  if (loading) {
    return <PageLoading />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
          <p className="mt-1 text-sm text-muted">Somente tarefas pessoais. Avaliações acadêmicas ficam em Notas.</p>
        </div>
        <Link href="/tarefas/nova" className="text-sm text-muted hover:text-foreground">
          Nova tarefa
        </Link>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Visualização da agenda">
        {VIEWS.map((item) => (
          <Button
            key={item.id}
            variant={view === item.id ? "primary" : "secondary"}
            onClick={() => {
              setView(item.id);
              if (item.id === "today") {
                setCursor(today);
                setSelected(today);
              }
            }}
            aria-pressed={view === item.id}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {view === "today" || view === "week" || view === "month" ? (
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="px-2" onClick={() => shift(-1)} aria-label="Período anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setCursor(today);
              setSelected(today);
            }}
          >
            Hoje
          </Button>
          <Button variant="secondary" className="px-2" onClick={() => shift(1)} aria-label="Próximo período">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ) : null}

      {actionError ? (
        <p className="text-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}

      {view === "week" ? (
        <div className="grid gap-2 md:grid-cols-7">
          {week.map((date) => (
            <Card key={date} className={cn("px-3 py-3", date === today && "border-accent/50")}>
              <button
                type="button"
                className="mb-2 w-full text-left"
                onClick={() => {
                  setSelected(date);
                  setView("today");
                  setCursor(date);
                }}
              >
                <p className="text-[11px] uppercase tracking-wide text-muted">{weekdayLabel(date)}</p>
                <p className={cn("mt-0.5 text-sm font-medium", date === today && "text-accent")}>
                  {formatCivilDate(date)}
                </p>
              </button>
              <ul className="space-y-1.5">
                {dated
                  .filter((task) => taskCivilDate(task, timeZone) === date)
                  .map((task) => (
                    <li key={task.id}>
                      <Link href={`/tarefas/${task.id}`} className="block truncate text-xs hover:text-accent">
                        {task.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : null}

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
            <div key={label} className="bg-surface px-2 py-2 text-center text-[11px] uppercase tracking-wide text-muted">
              {label}
            </div>
          ))}
          {grid.map((cell) => {
            const count = counts.get(cell.date) ?? 0;
            const isToday = cell.date === today;
            const isSelected = cell.date === selected;

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => setSelected(cell.date)}
                className={cn(
                  "min-h-16 bg-background px-2 py-2 text-left hover:bg-surface-hover",
                  !cell.inMonth && "text-muted/50",
                  isSelected && "bg-surface",
                  isToday && "outline outline-1 outline-accent outline-offset-[-1px]",
                )}
                aria-current={isToday ? "date" : undefined}
                aria-pressed={isSelected}
                aria-label={`${formatCivilDate(cell.date)}${count ? `, ${count} tarefas` : ""}`}
              >
                <span className="text-xs font-medium">{cell.date.slice(8)}</span>
                {count > 0 ? (
                  <span className="mt-2 block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {view === "today" || view === "month" ? (
        <section>
          <h3 className="mb-3 text-sm font-medium">
            {view === "month" ? `Tarefas em ${formatCivilDate(selected)}` : "Tarefas do dia"}
          </h3>
          {(view === "today" ? dated.filter((task) => taskCivilDate(task, timeZone) === cursor) : selectedTasks)
            .length === 0 ? (
            <EmptyState title="Nenhuma tarefa neste dia" description="Tarefas sem prazo ficam na aba correspondente." />
          ) : (
            <ul className="space-y-2">
              {(view === "today"
                ? dated.filter((task) => taskCivilDate(task, timeZone) === cursor)
                : selectedTasks
              ).map((task) => (
                <li key={task.id}>
                  <TaskListItem task={task} busy={busyId === task.id} onToggle={onToggle} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {view === "upcoming" ? (
        upcoming.length === 0 ? (
          <EmptyState title="Nenhuma tarefa com prazo" description="As próximas tarefas pendentes aparecem aqui." />
        ) : (
          <ul className="space-y-2">
            {upcoming.map((task) => (
              <li key={task.id}>
                <TaskListItem task={task} busy={busyId === task.id} onToggle={onToggle} />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {view === "undated" ? (
        undated.length === 0 ? (
          <EmptyState title="Nenhuma tarefa sem prazo" />
        ) : (
          <ul className="space-y-2">
            {undated.map((task) => (
              <li key={task.id}>
                <TaskListItem task={task} busy={busyId === task.id} onToggle={onToggle} />
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
