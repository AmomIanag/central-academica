import { pool } from "../../db/pool";
import { PERF_OP, timePerf } from "../../lib/perf";

export type StudentRecord = {
  id: string;
  name: string;
  ra: string | null;
  courseName: string | null;
};

export type TermRecord = {
  id: string;
  label: string;
};

export type UpcomingAssessmentRecord = {
  id: string;
  name: string;
  dueOn: string;
  discipline: {
    id: string;
    code: string;
    name: string;
  };
};

export async function findStudent(userId: string): Promise<StudentRecord | null> {
  const result = await timePerf(PERF_OP.dashboardFindStudent, () =>
    pool.query<{
      id: string;
      name: string;
      ra: string | null;
      course_name: string | null;
    }>(
      `
      SELECT id, name, ra, course_name
      FROM users
      WHERE id = $1
    `,
      [userId],
    ),
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    ra: row.ra,
    courseName: row.course_name,
  };
}

export async function findCurrentTerm(): Promise<TermRecord | null> {
  const result = await timePerf(PERF_OP.dashboardFindCurrentTerm, () =>
    pool.query<TermRecord>(
      `
      SELECT id, label
      FROM terms
      WHERE is_current = true
    `,
    ),
  );

  return result.rows[0] ?? null;
}

export async function listUpcomingAssessments(
  userId: string,
  limit: number,
): Promise<UpcomingAssessmentRecord[]> {
  const result = await timePerf(PERF_OP.dashboardListUpcomingAssessments, () =>
    pool.query<{
      id: string;
      name: string;
      due_on: string;
      discipline_id: string;
      code: string;
      discipline_name: string;
    }>(
      `
      SELECT
        a.id,
        a.name,
        to_char(a.due_on, 'YYYY-MM-DD') AS due_on,
        d.id AS discipline_id,
        d.code,
        d.name AS discipline_name
      FROM enrollments e
      JOIN disciplines d ON d.id = e.discipline_id
      JOIN terms t ON t.is_current = true AND d.academic_year = t.year
      JOIN assessments a ON a.discipline_id = d.id
      LEFT JOIN grades g ON g.assessment_id = a.id AND g.enrollment_id = e.id
      WHERE e.user_id = $1
        AND g.id IS NULL
        AND a.due_on IS NOT NULL
      ORDER BY a.due_on ASC, a.sort_order ASC, a.name ASC, a.id ASC
      LIMIT $2
    `,
      [userId, limit],
    ),
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    dueOn: row.due_on,
    discipline: {
      id: row.discipline_id,
      code: row.code,
      name: row.discipline_name,
    },
  }));
}
