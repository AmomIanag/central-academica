import {
  browserTimeZone,
  formatCivilDate,
  formatDateTime,
  isCivilDate,
  localTimeFromIso,
  toOffsetIso,
} from "./datetime";

export type TaskPriority = "low" | "normal" | "high";
export type TaskStatus = "pending" | "completed";

export type TaskDue =
  | null
  | {
      kind: "date";
      date: string;
    }
  | {
      kind: "datetime";
      at: string;
    };

export type TaskDiscipline = {
  id: string;
  code: string;
  name: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  discipline: TaskDiscipline | null;
  due: TaskDue;
  status: TaskStatus;
  overdue: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskSummary = {
  pendingCount: number;
  overdueCount: number;
  upcoming: Task[];
};

export type TaskWritePayload = {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  disciplineId?: string | null;
  due?: TaskDue;
};

export type TaskPatchPayload = {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  disciplineId?: string | null;
  due?: TaskDue;
};

export type EnrollmentOption = {
  id: string;
  code: string;
  name: string;
  term: {
    label: string;
  };
};

export type DueKind = "none" | "date" | "datetime";

export type TaskListFilters = {
  status?: TaskStatus | "";
  priority?: TaskPriority | "";
  disciplineId?: string;
};

export function priorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case "high":
      return "Alta";
    case "low":
      return "Baixa";
    default:
      return "Normal";
  }
}

export function statusLabel(status: TaskStatus): string {
  return status === "completed" ? "Concluída" : "Pendente";
}

export function formatTaskDue(due: TaskDue, timeZone = browserTimeZone()): string {
  if (!due) {
    return "Sem prazo";
  }

  if (due.kind === "date") {
    return formatCivilDate(due.date);
  }

  return formatDateTime(due.at, timeZone);
}

export function taskCivilDate(task: Task, timeZone = browserTimeZone()): string | null {
  if (!task.due) {
    return null;
  }

  if (task.due.kind === "date") {
    return task.due.date;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(task.due.at));
}

export function dueFromForm(kind: DueKind, date: string, time: string): TaskDue {
  if (kind === "none" || !date) {
    return null;
  }

  if (kind === "date") {
    return { kind: "date", date };
  }

  const clock = time || "00:00";
  const local = new Date(`${date}T${clock}:00`);
  return { kind: "datetime", at: toOffsetIso(local) };
}

export function dueToForm(due: TaskDue, timeZone = browserTimeZone()): {
  kind: DueKind;
  date: string;
  time: string;
} {
  if (!due) {
    return { kind: "none", date: "", time: "" };
  }

  if (due.kind === "date") {
    return { kind: "date", date: due.date, time: "" };
  }

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(due.at));

  return {
    kind: "datetime",
    date,
    time: localTimeFromIso(due.at, timeZone),
  };
}

export function validateTaskForm(input: {
  title: string;
  description: string;
  kind: DueKind;
  date: string;
  time: string;
}): Partial<Record<"title" | "description" | "date" | "time", string>> {
  const errors: Partial<Record<"title" | "description" | "date" | "time", string>> = {};
  const title = input.title.trim();

  if (!title) {
    errors.title = "Informe um título.";
  } else if (title.length > 160) {
    errors.title = "O título deve ter no máximo 160 caracteres.";
  }

  if (input.description.trim().length > 4000) {
    errors.description = "A descrição deve ter no máximo 4000 caracteres.";
  }

  if (input.kind === "date" || input.kind === "datetime") {
    if (!isCivilDate(input.date)) {
      errors.date = "Informe uma data válida.";
    }
  }

  if (input.kind === "datetime" && !errors.date) {
    if (!/^\d{2}:\d{2}$/.test(input.time)) {
      errors.time = "Informe um horário.";
    }
  }

  return errors;
}

export function sortTasksForAgenda(tasks: Task[], timeZone = browserTimeZone()): Task[] {
  return [...tasks].sort((left, right) => {
    const leftDate = taskCivilDate(left, timeZone);
    const rightDate = taskCivilDate(right, timeZone);

    if (leftDate !== rightDate) {
      if (!leftDate) return 1;
      if (!rightDate) return -1;
      if (leftDate !== rightDate) {
        return leftDate < rightDate ? -1 : 1;
      }
    }

    const leftAt = left.due?.kind === "datetime" ? left.due.at : "";
    const rightAt = right.due?.kind === "datetime" ? right.due.at : "";

    if (leftAt !== rightAt) {
      if (!leftAt) return -1;
      if (!rightAt) return 1;
      return leftAt < rightAt ? -1 : 1;
    }

    return left.title.localeCompare(right.title, "pt-BR");
  });
}
