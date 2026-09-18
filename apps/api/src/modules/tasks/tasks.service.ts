import { randomUUID } from "node:crypto";
import { AppError, notFound } from "../../http/app-error";
import { civilDateInTimeZone, rangeToUtcBounds } from "../../lib/timezone";
import type { CreateTaskInput, ListTasksQuery, PatchTaskInput } from "./tasks.schemas";
import {
  completeTask as completeTaskRow,
  countTaskSummary,
  deleteTask as deleteTaskRow,
  dueToColumns,
  enrollmentExists,
  findTask,
  insertTask,
  listEnrollmentOptions,
  listTasks as listTaskRows,
  listUpcomingTasks,
  reopenTask as reopenTaskRow,
  updateTask as updateTaskRow,
  type TaskRow,
} from "./tasks.repository";
import type { EnrollmentOption, Task, TaskSummary } from "./tasks.types";

const DEFAULT_TIME_ZONE = "UTC";
const UPCOMING_LIMIT = 3;
const TASK_NOT_FOUND = "Task not found.";
const DISCIPLINE_NOT_FOUND = "Discipline not found.";

function toIso(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  return new Date(value).toISOString();
}

function isOverdue(row: TaskRow, now: Date, timeZone: string): boolean {
  if (row.completed_at) {
    return false;
  }

  if (row.due_on) {
    return row.due_on < civilDateInTimeZone(now, timeZone);
  }

  if (row.due_at) {
    return new Date(row.due_at).getTime() < now.getTime();
  }

  return false;
}

function toTask(row: TaskRow, timeZone: string, now = new Date()): Task {
  const due = row.due_on
    ? { kind: "date" as const, date: row.due_on }
    : row.due_at
      ? { kind: "datetime" as const, at: new Date(row.due_at).toISOString() }
      : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    discipline:
      row.discipline_id && row.discipline_code && row.discipline_name
        ? {
            id: row.discipline_id,
            code: row.discipline_code,
            name: row.discipline_name,
          }
        : null,
    due,
    status: row.completed_at ? "completed" : "pending",
    overdue: isOverdue(row, now, timeZone),
    completedAt: toIso(row.completed_at),
    createdAt: toIso(row.created_at) as string,
    updatedAt: toIso(row.updated_at) as string,
  };
}

async function assertEnrollment(userId: string, disciplineId: string | null | undefined): Promise<void> {
  if (!disciplineId) {
    return;
  }

  const enrolled = await enrollmentExists(userId, disciplineId);

  if (!enrolled) {
    throw notFound(DISCIPLINE_NOT_FOUND);
  }
}

function pgErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return undefined;
}

function rethrowConstraint(error: unknown): never {
  const code = pgErrorCode(error);

  if (code === "23503") {
    throw notFound(DISCIPLINE_NOT_FOUND);
  }

  if (code === "23514") {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid task payload.");
  }

  throw error;
}

export async function createTask(userId: string, input: CreateTaskInput, timeZone = DEFAULT_TIME_ZONE): Promise<Task> {
  await assertEnrollment(userId, input.disciplineId ?? null);
  const due = dueToColumns(input.due ?? null);

  try {
    const row = await insertTask({
      id: randomUUID(),
      userId,
      disciplineId: input.disciplineId ?? null,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      dueOn: due?.dueOn ?? null,
      dueAt: due?.dueAt ?? null,
    });

    return toTask(row, timeZone);
  } catch (error) {
    rethrowConstraint(error);
  }
}

export async function getTask(userId: string, id: string, timeZone = DEFAULT_TIME_ZONE): Promise<Task> {
  const row = await findTask(userId, id);

  if (!row) {
    throw notFound(TASK_NOT_FOUND);
  }

  return toTask(row, timeZone);
}

export async function listTasks(
  userId: string,
  query: ListTasksQuery,
): Promise<Task[]> {
  const timeZone = query.timeZone ?? DEFAULT_TIME_ZONE;
  const range =
    query.from || query.to
      ? rangeToUtcBounds(query.from, query.to, timeZone)
      : { start: null, end: null };
  const rows = await listTaskRows(userId, query, range);
  return rows.map((row) => toTask(row, timeZone));
}

export async function patchTask(
  userId: string,
  id: string,
  input: PatchTaskInput,
  timeZone = DEFAULT_TIME_ZONE,
): Promise<Task> {
  const existing = await findTask(userId, id);

  if (!existing) {
    throw notFound(TASK_NOT_FOUND);
  }

  if (input.disciplineId !== undefined) {
    await assertEnrollment(userId, input.disciplineId);
  }

  const due = dueToColumns(input.due);

  try {
    const row = await updateTaskRow(userId, id, {
      title: input.title,
      description: input.description,
      priority: input.priority,
      disciplineId: input.disciplineId,
      dueOn: due?.dueOn,
      dueAt: due?.dueAt,
    });

    if (!row) {
      throw notFound(TASK_NOT_FOUND);
    }

    return toTask(row, timeZone);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    rethrowConstraint(error);
  }
}

export async function completeTask(
  userId: string,
  id: string,
  timeZone = DEFAULT_TIME_ZONE,
): Promise<Task> {
  const updated = await completeTaskRow(userId, id);

  if (updated) {
    return toTask(updated, timeZone);
  }

  return getTask(userId, id, timeZone);
}

export async function reopenTask(
  userId: string,
  id: string,
  timeZone = DEFAULT_TIME_ZONE,
): Promise<Task> {
  const updated = await reopenTaskRow(userId, id);

  if (updated) {
    return toTask(updated, timeZone);
  }

  return getTask(userId, id, timeZone);
}

export async function removeTask(userId: string, id: string): Promise<void> {
  const deleted = await deleteTaskRow(userId, id);

  if (!deleted) {
    throw notFound(TASK_NOT_FOUND);
  }
}

export async function getTaskSummary(userId: string, timeZone = DEFAULT_TIME_ZONE): Promise<TaskSummary> {
  const today = civilDateInTimeZone(new Date(), timeZone);
  const [counts, upcoming] = await Promise.all([
    countTaskSummary(userId, today),
    listUpcomingTasks(userId, timeZone, UPCOMING_LIMIT),
  ]);

  return {
    pendingCount: counts.pendingCount,
    overdueCount: counts.overdueCount,
    upcoming: upcoming.map((row) => toTask(row, timeZone)),
  };
}

export async function getTaskOptions(userId: string): Promise<{ disciplines: EnrollmentOption[] }> {
  const rows = await listEnrollmentOptions(userId);

  return {
    disciplines: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      term: { label: row.term_label },
    })),
  };
}
