import { pool } from "../../db/pool";
import type { ListTasksQuery, TaskDue } from "./tasks.schemas";
import type { TaskPriority } from "./tasks.types";

export type TaskRow = {
  id: string;
  user_id: string;
  discipline_id: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_on: string | null;
  due_at: Date | string | null;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  discipline_code: string | null;
  discipline_name: string | null;
};

export type EnrollmentOptionRow = {
  id: string;
  code: string;
  name: string;
  term_label: string;
};

const TASK_SELECT = `
  SELECT
    t.id,
    t.user_id,
    t.discipline_id,
    t.title,
    t.description,
    t.priority,
    to_char(t.due_on, 'YYYY-MM-DD') AS due_on,
    t.due_at,
    t.completed_at,
    t.created_at,
    t.updated_at,
    d.code AS discipline_code,
    d.name AS discipline_name
  FROM tasks t
  LEFT JOIN disciplines d ON d.id = t.discipline_id
`;

export type DueColumns = {
  dueOn: string | null;
  dueAt: Date | null;
};

export function dueToColumns(due: TaskDue | undefined): DueColumns | undefined {
  if (due === undefined) {
    return undefined;
  }

  if (due === null) {
    return { dueOn: null, dueAt: null };
  }

  if (due.kind === "date") {
    return { dueOn: due.date, dueAt: null };
  }

  return { dueOn: null, dueAt: new Date(due.at) };
}

export async function enrollmentExists(userId: string, disciplineId: string): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM enrollments
      WHERE user_id = $1 AND discipline_id = $2
    `,
    [userId, disciplineId],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function listEnrollmentOptions(userId: string): Promise<EnrollmentOptionRow[]> {
  const result = await pool.query<EnrollmentOptionRow>(
    `
      SELECT
        d.id,
        d.code,
        d.name,
        t.label AS term_label
      FROM enrollments e
      JOIN disciplines d ON d.id = e.discipline_id
      JOIN terms t ON t.id = d.term_id
      WHERE e.user_id = $1
      ORDER BY t.label DESC, d.code ASC, d.name ASC
    `,
    [userId],
  );

  return result.rows;
}

export async function insertTask(input: {
  id: string;
  userId: string;
  disciplineId: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueOn: string | null;
  dueAt: Date | null;
}): Promise<TaskRow> {
  const result = await pool.query<TaskRow>(
    `
      WITH created AS (
        INSERT INTO tasks (
          id, user_id, discipline_id, title, description, priority, due_on, due_at, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
        RETURNING *
      )
      ${TASK_SELECT.replace("FROM tasks t", "FROM created t")}
    `,
    [
      input.id,
      input.userId,
      input.disciplineId,
      input.title,
      input.description,
      input.priority,
      input.dueOn,
      input.dueAt,
    ],
  );

  return result.rows[0];
}

export async function findTask(userId: string, id: string): Promise<TaskRow | null> {
  const result = await pool.query<TaskRow>(
    `
      ${TASK_SELECT}
      WHERE t.id = $1 AND t.user_id = $2
    `,
    [id, userId],
  );

  return result.rows[0] ?? null;
}

export async function listTasks(
  userId: string,
  query: ListTasksQuery,
  range: { start: Date | null; end: Date | null },
): Promise<TaskRow[]> {
  const values: unknown[] = [userId];
  const where = ["t.user_id = $1"];
  let index = 1;

  if (query.status === "pending") {
    where.push("t.completed_at IS NULL");
  } else if (query.status === "completed") {
    where.push("t.completed_at IS NOT NULL");
  }

  if (query.priority) {
    index += 1;
    values.push(query.priority);
    where.push(`t.priority = $${index}`);
  }

  if (query.disciplineId) {
    index += 1;
    values.push(query.disciplineId);
    where.push(`t.discipline_id = $${index}`);
  }

  if (query.from !== undefined || query.to !== undefined) {
    const dateClauses: string[] = [];
    const instantClauses: string[] = [];

    if (query.from !== undefined) {
      index += 1;
      values.push(query.from);
      dateClauses.push(`t.due_on >= $${index}`);
    }

    if (query.to !== undefined) {
      index += 1;
      values.push(query.to);
      dateClauses.push(`t.due_on <= $${index}`);
    }

    if (range.start) {
      index += 1;
      values.push(range.start);
      instantClauses.push(`t.due_at >= $${index}`);
    }

    if (range.end) {
      index += 1;
      values.push(range.end);
      instantClauses.push(`t.due_at < $${index}`);
    }

    const dueOnMatch = `t.due_on IS NOT NULL${dateClauses.length ? ` AND ${dateClauses.join(" AND ")}` : ""}`;
    const dueAtMatch = `t.due_at IS NOT NULL${instantClauses.length ? ` AND ${instantClauses.join(" AND ")}` : ""}`;
    where.push(`((${dueOnMatch}) OR (${dueAtMatch}))`);
  }

  index += 1;
  values.push(query.limit);
  const limitIndex = index;
  index += 1;
  values.push(query.offset);
  const offsetIndex = index;

  const result = await pool.query<TaskRow>(
    `
      ${TASK_SELECT}
      WHERE ${where.join(" AND ")}
      ORDER BY
        CASE WHEN t.completed_at IS NULL THEN 0 ELSE 1 END,
        t.due_on ASC NULLS LAST,
        t.due_at ASC NULLS LAST,
        t.created_at DESC,
        t.id ASC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex}
    `,
    values,
  );

  return result.rows;
}

export async function updateTask(
  userId: string,
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    disciplineId?: string | null;
    dueOn?: string | null;
    dueAt?: Date | null;
  },
): Promise<TaskRow | null> {
  const sets = ["updated_at = now()"];
  const values: unknown[] = [];
  let index = 0;

  if (patch.title !== undefined) {
    index += 1;
    values.push(patch.title);
    sets.push(`title = $${index}`);
  }

  if (patch.description !== undefined) {
    index += 1;
    values.push(patch.description);
    sets.push(`description = $${index}`);
  }

  if (patch.priority !== undefined) {
    index += 1;
    values.push(patch.priority);
    sets.push(`priority = $${index}`);
  }

  if (patch.disciplineId !== undefined) {
    index += 1;
    values.push(patch.disciplineId);
    sets.push(`discipline_id = $${index}`);
  }

  if (patch.dueOn !== undefined || patch.dueAt !== undefined) {
    index += 1;
    values.push(patch.dueOn ?? null);
    sets.push(`due_on = $${index}`);
    index += 1;
    values.push(patch.dueAt ?? null);
    sets.push(`due_at = $${index}`);
  }

  index += 1;
  values.push(id);
  const idIndex = index;
  index += 1;
  values.push(userId);
  const userIndex = index;

  const result = await pool.query<TaskRow>(
    `
      WITH updated AS (
        UPDATE tasks
        SET ${sets.join(", ")}
        WHERE id = $${idIndex} AND user_id = $${userIndex}
        RETURNING *
      )
      ${TASK_SELECT.replace("FROM tasks t", "FROM updated t")}
    `,
    values,
  );

  return result.rows[0] ?? null;
}

export async function completeTask(userId: string, id: string): Promise<TaskRow | null> {
  const result = await pool.query<TaskRow>(
    `
      WITH updated AS (
        UPDATE tasks
        SET completed_at = now(), updated_at = now()
        WHERE id = $1 AND user_id = $2 AND completed_at IS NULL
        RETURNING *
      )
      ${TASK_SELECT.replace("FROM tasks t", "FROM updated t")}
    `,
    [id, userId],
  );

  return result.rows[0] ?? null;
}

export async function reopenTask(userId: string, id: string): Promise<TaskRow | null> {
  const result = await pool.query<TaskRow>(
    `
      WITH updated AS (
        UPDATE tasks
        SET completed_at = NULL, updated_at = now()
        WHERE id = $1 AND user_id = $2 AND completed_at IS NOT NULL
        RETURNING *
      )
      ${TASK_SELECT.replace("FROM tasks t", "FROM updated t")}
    `,
    [id, userId],
  );

  return result.rows[0] ?? null;
}

export async function deleteTask(userId: string, id: string): Promise<boolean> {
  const result = await pool.query(
    `
      DELETE FROM tasks
      WHERE id = $1 AND user_id = $2
    `,
    [id, userId],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function countTaskSummary(
  userId: string,
  today: string,
): Promise<{ pendingCount: number; overdueCount: number }> {
  const result = await pool.query<{ pending_count: string; overdue_count: string }>(
    `
      SELECT
        COUNT(*) FILTER (WHERE completed_at IS NULL)::text AS pending_count,
        COUNT(*) FILTER (
          WHERE completed_at IS NULL
            AND (
              (due_on IS NOT NULL AND due_on < $2)
              OR (due_at IS NOT NULL AND due_at < now())
            )
        )::text AS overdue_count
      FROM tasks
      WHERE user_id = $1
    `,
    [userId, today],
  );

  const row = result.rows[0];

  return {
    pendingCount: Number(row?.pending_count ?? 0),
    overdueCount: Number(row?.overdue_count ?? 0),
  };
}

export async function listUpcomingTasks(
  userId: string,
  timeZone: string,
  limit: number,
): Promise<TaskRow[]> {
  const result = await pool.query<TaskRow>(
    `
      ${TASK_SELECT}
      WHERE t.user_id = $1
        AND t.completed_at IS NULL
        AND (t.due_on IS NOT NULL OR t.due_at IS NOT NULL)
      ORDER BY
        COALESCE(t.due_on, (t.due_at AT TIME ZONE $2)::date) ASC,
        t.due_at ASC NULLS LAST,
        t.created_at ASC,
        t.id ASC
      LIMIT $3
    `,
    [userId, timeZone, limit],
  );

  return result.rows;
}
