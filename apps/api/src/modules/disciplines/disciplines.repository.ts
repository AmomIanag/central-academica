import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { pool } from "../../db/pool";
import { PERF_OP, timePerf } from "../../lib/perf";
import { toNullableNumber, toNumber, type AcademicSemester, type AssessmentKind } from "../academic/grades";

export type Queryable = Pick<typeof pool, "query"> | PoolClient;

export type AssessmentRecord = {
  id: string;
  semester: AcademicSemester;
  kind: AssessmentKind;
  name: string;
  weight: number;
  dueOn: string | null;
  sortOrder: number;
  score: number | null;
};

export type DisciplineRecord = {
  id: string;
  code: string;
  name: string;
  academicYear: number;
  ownerUserId: string;
  enrollmentId: string;
  totalClasses: number;
  absences: number;
  term: {
    id: string;
    label: string;
  };
  professor: {
    id: string;
    name: string;
  };
  assessments: AssessmentRecord[];
};

type EnrollmentJoinRow = {
  discipline_id: string;
  code: string;
  name: string;
  academic_year: number;
  owner_user_id: string;
  enrollment_id: string;
  total_classes: number;
  absences: number;
  professor_id: string;
  professor_name: string;
  term_id: string;
  term_label: string;
  assessment_id: string | null;
  assessment_name: string | null;
  semester: number | null;
  kind: AssessmentKind | null;
  weight: string | number | null;
  due_on: string | null;
  sort_order: number | null;
  score: string | number | null;
};

const ENROLLMENT_SQL = `
  SELECT
    d.id AS discipline_id,
    d.code,
    d.name,
    d.academic_year,
    d.owner_user_id,
    e.id AS enrollment_id,
    e.total_classes,
    e.absences,
    p.id AS professor_id,
    p.name AS professor_name,
    t.id AS term_id,
    t.label AS term_label,
    a.id AS assessment_id,
    a.name AS assessment_name,
    a.semester,
    a.kind,
    a.weight,
    to_char(a.due_on, 'YYYY-MM-DD') AS due_on,
    a.sort_order,
    g.score
  FROM enrollments e
  JOIN disciplines d ON d.id = e.discipline_id
  JOIN terms t ON t.is_current = true AND d.academic_year = t.year
  JOIN professors p ON p.id = d.professor_id
  LEFT JOIN assessments a ON a.discipline_id = d.id
  LEFT JOIN grades g ON g.assessment_id = a.id AND g.enrollment_id = e.id
  WHERE e.user_id = $1
`;

function groupRows(rows: EnrollmentJoinRow[]): DisciplineRecord[] {
  const disciplines = new Map<string, DisciplineRecord>();

  for (const row of rows) {
    let discipline = disciplines.get(row.discipline_id);

    if (!discipline) {
      discipline = {
        id: row.discipline_id,
        code: row.code,
        name: row.name,
        academicYear: row.academic_year,
        ownerUserId: row.owner_user_id,
        enrollmentId: row.enrollment_id,
        totalClasses: row.total_classes,
        absences: row.absences,
        term: {
          id: row.term_id,
          label: row.term_label,
        },
        professor: {
          id: row.professor_id,
          name: row.professor_name,
        },
        assessments: [],
      };
      disciplines.set(row.discipline_id, discipline);
    }

    if (
      row.assessment_id &&
      row.assessment_name !== null &&
      row.weight !== null &&
      row.sort_order !== null &&
      row.semester !== null &&
      row.kind !== null
    ) {
      discipline.assessments.push({
        id: row.assessment_id,
        semester: row.semester as AcademicSemester,
        kind: row.kind,
        name: row.assessment_name,
        weight: toNumber(row.weight),
        dueOn: row.due_on,
        sortOrder: row.sort_order,
        score: toNullableNumber(row.score),
      });
    }
  }

  return [...disciplines.values()];
}

export async function listCurrentEnrollments(
  userId: string,
  db: Queryable = pool,
): Promise<DisciplineRecord[]> {
  const result = await timePerf(PERF_OP.disciplinesListCurrentEnrollments, () =>
    db.query<EnrollmentJoinRow>(
      `
      ${ENROLLMENT_SQL}
      ORDER BY d.code ASC, d.name ASC, a.sort_order ASC, a.semester ASC, a.kind ASC, a.id ASC
    `,
      [userId],
    ),
  );

  return groupRows(result.rows);
}

export async function findCurrentEnrollment(
  userId: string,
  disciplineId: string,
  db: Queryable = pool,
): Promise<DisciplineRecord | null> {
  const result = await db.query<EnrollmentJoinRow>(
    `
      ${ENROLLMENT_SQL}
        AND d.id = $2
      ORDER BY a.sort_order ASC, a.semester ASC, a.kind ASC, a.id ASC
    `,
    [userId, disciplineId],
  );

  return groupRows(result.rows)[0] ?? null;
}

export async function findCurrentTerm(
  db: Queryable = pool,
): Promise<{ id: string; label: string; year: number } | null> {
  const result = await db.query<{ id: string; label: string; year: number }>(
    `
      SELECT id, label, year
      FROM terms
      WHERE is_current = true
    `,
  );

  return result.rows[0] ?? null;
}

export async function countEnrollments(disciplineId: string, db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM enrollments
      WHERE discipline_id = $1
    `,
    [disciplineId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function countLinkedTasks(
  userId: string,
  disciplineId: string,
  db: Queryable = pool,
): Promise<number> {
  const result = await db.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM tasks
      WHERE user_id = $1 AND discipline_id = $2
    `,
    [userId, disciplineId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function findOwnedProfessorByName(
  ownerUserId: string,
  name: string,
  db: Queryable = pool,
): Promise<{ id: string; name: string } | null> {
  const result = await db.query<{ id: string; name: string }>(
    `
      SELECT p.id, p.name
      FROM professors p
      JOIN disciplines d ON d.professor_id = p.id
      WHERE d.owner_user_id = $1
        AND lower(p.name) = lower($2)
      ORDER BY p.id ASC
      LIMIT 1
    `,
    [ownerUserId, name],
  );

  return result.rows[0] ?? null;
}

export async function insertProfessor(
  name: string,
  db: Queryable = pool,
): Promise<{ id: string; name: string }> {
  const id = randomUUID();
  await db.query(
    `
      INSERT INTO professors (id, name, email)
      VALUES ($1, $2, NULL)
    `,
    [id, name],
  );

  return { id, name };
}

export async function insertDiscipline(
  input: {
    id: string;
    termId: string;
    professorId: string;
    code: string;
    name: string;
    ownerUserId: string;
    academicYear: number;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      INSERT INTO disciplines (
        id, term_id, professor_id, code, name, owner_user_id, academic_year
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      input.id,
      input.termId,
      input.professorId,
      input.code,
      input.name,
      input.ownerUserId,
      input.academicYear,
    ],
  );
}

export async function insertEnrollment(
  input: {
    id: string;
    userId: string;
    disciplineId: string;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      INSERT INTO enrollments (id, user_id, discipline_id, total_classes, absences)
      VALUES ($1, $2, $3, 0, 0)
    `,
    [input.id, input.userId, input.disciplineId],
  );
}

export async function insertAssessmentSlot(
  input: {
    id: string;
    disciplineId: string;
    semester: AcademicSemester;
    kind: AssessmentKind;
    weight: number;
    sortOrder: number;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      INSERT INTO assessments (
        id, discipline_id, name, weight, due_on, sort_order, semester, kind
      )
      VALUES ($1, $2, $3, $4, NULL, $5, $6, $7)
    `,
    [input.id, input.disciplineId, input.kind, input.weight, input.sortOrder, input.semester, input.kind],
  );
}

export async function updateDiscipline(
  input: {
    id: string;
    name?: string;
    professorId?: string;
  },
  db: Queryable = pool,
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (input.name !== undefined) {
    values.push(input.name);
    sets.push(`name = $${index}`);
    index += 1;
  }

  if (input.professorId !== undefined) {
    values.push(input.professorId);
    sets.push(`professor_id = $${index}`);
    index += 1;
  }

  if (sets.length === 0) {
    return;
  }

  values.push(input.id);
  await db.query(
    `
      UPDATE disciplines
      SET ${sets.join(", ")}
      WHERE id = $${index}
    `,
    values,
  );
}

export async function updateAttendance(
  enrollmentId: string,
  totalClasses: number,
  absences: number,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      UPDATE enrollments
      SET total_classes = $2, absences = $3
      WHERE id = $1
    `,
    [enrollmentId, totalClasses, absences],
  );
}

export async function findAssessmentSlot(
  disciplineId: string,
  semester: AcademicSemester,
  kind: AssessmentKind,
  db: Queryable = pool,
): Promise<{ id: string } | null> {
  const result = await db.query<{ id: string }>(
    `
      SELECT id
      FROM assessments
      WHERE discipline_id = $1 AND semester = $2 AND kind = $3
    `,
    [disciplineId, semester, kind],
  );

  return result.rows[0] ?? null;
}

export async function upsertGrade(
  input: {
    id: string;
    enrollmentId: string;
    assessmentId: string;
    score: number;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      INSERT INTO grades (id, enrollment_id, assessment_id, score)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (enrollment_id, assessment_id) DO UPDATE SET
        score = EXCLUDED.score
    `,
    [input.id, input.enrollmentId, input.assessmentId, input.score],
  );
}

export async function deleteGrade(
  enrollmentId: string,
  assessmentId: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      DELETE FROM grades
      WHERE enrollment_id = $1 AND assessment_id = $2
    `,
    [enrollmentId, assessmentId],
  );
}

export async function deleteDisciplineGraph(
  input: {
    enrollmentId: string;
    disciplineId: string;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(`DELETE FROM grades WHERE enrollment_id = $1`, [input.enrollmentId]);
  await db.query(`DELETE FROM assessments WHERE discipline_id = $1`, [input.disciplineId]);
  await db.query(`DELETE FROM enrollments WHERE id = $1`, [input.enrollmentId]);
  await db.query(`DELETE FROM disciplines WHERE id = $1`, [input.disciplineId]);
}
