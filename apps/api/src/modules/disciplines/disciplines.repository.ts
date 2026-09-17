import { pool } from "../../db/pool";
import { toNullableNumber, toNumber } from "../academic/grades";

export type AssessmentRecord = {
  id: string;
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
  professor_id: string;
  professor_name: string;
  term_id: string;
  term_label: string;
  assessment_id: string | null;
  assessment_name: string | null;
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
    p.id AS professor_id,
    p.name AS professor_name,
    t.id AS term_id,
    t.label AS term_label,
    a.id AS assessment_id,
    a.name AS assessment_name,
    a.weight,
    to_char(a.due_on, 'YYYY-MM-DD') AS due_on,
    a.sort_order,
    g.score
  FROM enrollments e
  JOIN disciplines d ON d.id = e.discipline_id
  JOIN terms t ON t.id = d.term_id AND t.is_current = true
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

    if (row.assessment_id && row.assessment_name !== null && row.weight !== null && row.sort_order !== null) {
      discipline.assessments.push({
        id: row.assessment_id,
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

export async function listCurrentEnrollments(userId: string): Promise<DisciplineRecord[]> {
  const result = await pool.query<EnrollmentJoinRow>(
    `
      ${ENROLLMENT_SQL}
      ORDER BY d.code ASC, d.name ASC, a.sort_order ASC, a.name ASC, a.id ASC
    `,
    [userId],
  );

  return groupRows(result.rows);
}

export async function findCurrentEnrollment(
  userId: string,
  disciplineId: string,
): Promise<DisciplineRecord | null> {
  const result = await pool.query<EnrollmentJoinRow>(
    `
      ${ENROLLMENT_SQL}
        AND d.id = $2
      ORDER BY a.sort_order ASC, a.name ASC, a.id ASC
    `,
    [userId, disciplineId],
  );

  return groupRows(result.rows)[0] ?? null;
}
