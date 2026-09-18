import type { PoolClient } from "pg";
import { hashPassword } from "../modules/auth/password";
import { assertProjectDatabase } from "./assert-project-database";
import { pool } from "./pool";

assertProjectDatabase();

const DEV_PASSWORD = "admin123";
const DEV_PASSWORD_SALT = Buffer.from("central-acad-seed");

const IDS = {
  user: "a1111111-1111-4111-8111-111111111111",
  term: "a2222222-2222-4222-8222-222222222222",
  professors: {
    ana: "a3333333-3333-4333-8333-000000000001",
    bruno: "a3333333-3333-4333-8333-000000000002",
    camila: "a3333333-3333-4333-8333-000000000003",
    diego: "a3333333-3333-4333-8333-000000000004",
    elisa: "a3333333-3333-4333-8333-000000000005",
  },
  disciplines: {
    mobile: "a4444444-4444-4444-8444-000000000001",
    ddd: "a4444444-4444-4444-8444-000000000002",
    iot: "a4444444-4444-4444-8444-000000000003",
    research: "a4444444-4444-4444-8444-000000000004",
    java: "a4444444-4444-4444-8444-000000000005",
  },
  enrollments: {
    mobile: "a5555555-5555-4555-8555-000000000001",
    ddd: "a5555555-5555-4555-8555-000000000002",
    iot: "a5555555-5555-4555-8555-000000000003",
    research: "a5555555-5555-4555-8555-000000000004",
    java: "a5555555-5555-4555-8555-000000000005",
  },
} as const;

type DisciplineKey = keyof typeof IDS.disciplines;

const SLOTS = [
  { semester: 1, kind: "CP", weight: "0.4000", sortOrder: 1, kindN: "1" },
  { semester: 1, kind: "GS", weight: "0.6000", sortOrder: 2, kindN: "2" },
  { semester: 2, kind: "CP", weight: "0.4000", sortOrder: 3, kindN: "1" },
  { semester: 2, kind: "GS", weight: "0.6000", sortOrder: 4, kindN: "2" },
] as const;

const DISCIPLINE_INDEX: Record<DisciplineKey, string> = {
  mobile: "1",
  ddd: "2",
  iot: "3",
  research: "4",
  java: "5",
};

function assessmentId(disciplineKey: DisciplineKey, semester: 1 | 2, kind: "CP" | "GS"): string {
  const kindN = kind === "CP" ? "1" : "2";
  return `a6666666-6666-4666-8666-000000000${DISCIPLINE_INDEX[disciplineKey]}${semester}${kindN}`;
}

function gradeId(disciplineKey: DisciplineKey, semester: 1 | 2, kind: "CP" | "GS"): string {
  const kindN = kind === "CP" ? "1" : "2";
  return `a7777777-7777-4777-8777-000000000${DISCIPLINE_INDEX[disciplineKey]}${semester}${kindN}`;
}

const dueOnBySlot: Partial<Record<DisciplineKey, Partial<Record<string, string>>>> = {
  iot: { "2-CP": "2026-06-25", "2-GS": "2026-06-28" },
  java: {
    "1-CP": "2026-09-30",
    "1-GS": "2026-10-20",
    "2-CP": "2026-11-15",
    "2-GS": "2026-12-10",
  },
};

const grades: Array<{
  discipline: DisciplineKey;
  semester: 1 | 2;
  kind: "CP" | "GS";
  score: string;
}> = [
  { discipline: "mobile", semester: 1, kind: "CP", score: "60.00" },
  { discipline: "mobile", semester: 1, kind: "GS", score: "80.00" },
  { discipline: "mobile", semester: 2, kind: "CP", score: "70.00" },
  { discipline: "mobile", semester: 2, kind: "GS", score: "100.00" },
  { discipline: "ddd", semester: 1, kind: "CP", score: "30.00" },
  { discipline: "ddd", semester: 1, kind: "GS", score: "20.00" },
  { discipline: "ddd", semester: 2, kind: "CP", score: "25.00" },
  { discipline: "ddd", semester: 2, kind: "GS", score: "30.00" },
  { discipline: "iot", semester: 1, kind: "CP", score: "80.00" },
  { discipline: "iot", semester: 1, kind: "GS", score: "75.00" },
  { discipline: "research", semester: 1, kind: "CP", score: "65.00" },
  { discipline: "research", semester: 1, kind: "GS", score: "70.00" },
  { discipline: "research", semester: 2, kind: "CP", score: "50.00" },
  { discipline: "research", semester: 2, kind: "GS", score: "50.00" },
];

async function upsert(client: PoolClient, sql: string, values: unknown[]): Promise<void> {
  await client.query(sql, values);
}

async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await upsert(
      client,
      `
        INSERT INTO users (id, name, email, password_hash, ra, course_name, role)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          ra = EXCLUDED.ra,
          course_name = EXCLUDED.course_name,
          role = EXCLUDED.role
      `,
      [
        IDS.user,
        "Aluno Teste",
        "amom.admin@central.local",
        hashPassword(DEV_PASSWORD, DEV_PASSWORD_SALT),
        "RM000000",
        "Análise e Desenvolvimento de Sistemas",
        "student",
      ],
    );

    await upsert(
      client,
      `
        INSERT INTO terms (id, label, year, semester, starts_on, ends_on, is_current)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          label = EXCLUDED.label,
          year = EXCLUDED.year,
          semester = EXCLUDED.semester,
          starts_on = EXCLUDED.starts_on,
          ends_on = EXCLUDED.ends_on,
          is_current = EXCLUDED.is_current
      `,
      [IDS.term, "2026", 2026, 1, "2026-02-02", "2026-12-15", true],
    );

    const professors = [
      [IDS.professors.ana, "Ana Souza", "ana.souza@central.local"],
      [IDS.professors.bruno, "Bruno Lima", "bruno.lima@central.local"],
      [IDS.professors.camila, "Camila Rocha", "camila.rocha@central.local"],
      [IDS.professors.diego, "Diego Martins", "diego.martins@central.local"],
      [IDS.professors.elisa, "Elisa Ferreira", "elisa.ferreira@central.local"],
    ];

    for (const [id, name, email] of professors) {
      await upsert(
        client,
        `
          INSERT INTO professors (id, name, email)
          VALUES ($1, $2, $3)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email
        `,
        [id, name, email],
      );
    }

    const disciplines: Array<[string, string, string, string]> = [
      [IDS.disciplines.mobile, "2TDSPJ", "Mobile Application Development", IDS.professors.ana],
      [IDS.disciplines.ddd, "2TDSPD", "Domain Driven Design", IDS.professors.bruno],
      [IDS.disciplines.iot, "2TDSPI", "Disruptive Architectures: IoT, IoB & Generative IA", IDS.professors.camila],
      [IDS.disciplines.research, "2TDSPG", "Research and Innovation in IT", IDS.professors.diego],
      [IDS.disciplines.java, "2TDSPK", "Java Advanced", IDS.professors.elisa],
    ];

    for (const [id, code, name, professorId] of disciplines) {
      await upsert(
        client,
        `
          INSERT INTO disciplines (id, term_id, professor_id, code, name, owner_user_id, academic_year)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            term_id = EXCLUDED.term_id,
            professor_id = EXCLUDED.professor_id,
            code = EXCLUDED.code,
            name = EXCLUDED.name,
            owner_user_id = EXCLUDED.owner_user_id,
            academic_year = EXCLUDED.academic_year
        `,
        [id, IDS.term, professorId, code, name, IDS.user, 2026],
      );
    }

    const enrollmentPairs: Array<[string, string, number, number]> = [
      [IDS.enrollments.mobile, IDS.disciplines.mobile, 40, 6],
      [IDS.enrollments.ddd, IDS.disciplines.ddd, 0, 0],
      [IDS.enrollments.iot, IDS.disciplines.iot, 0, 0],
      [IDS.enrollments.research, IDS.disciplines.research, 0, 0],
      [IDS.enrollments.java, IDS.disciplines.java, 0, 0],
    ];

    for (const [id, disciplineId, totalClasses, absences] of enrollmentPairs) {
      await upsert(
        client,
        `
          INSERT INTO enrollments (id, user_id, discipline_id, total_classes, absences)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            discipline_id = EXCLUDED.discipline_id,
            total_classes = EXCLUDED.total_classes,
            absences = EXCLUDED.absences
        `,
        [id, IDS.user, disciplineId, totalClasses, absences],
      );
    }

    await client.query(
      `
        DELETE FROM grades
        WHERE enrollment_id = ANY($1::uuid[])
           OR assessment_id IN (
             SELECT id FROM assessments WHERE discipline_id = ANY($2::uuid[])
           )
      `,
      [Object.values(IDS.enrollments), Object.values(IDS.disciplines)],
    );
    await client.query(
      `
        DELETE FROM assessments
        WHERE discipline_id = ANY($1::uuid[])
      `,
      [Object.values(IDS.disciplines)],
    );

    for (const key of Object.keys(IDS.disciplines) as DisciplineKey[]) {
      for (const slot of SLOTS) {
        await upsert(
          client,
          `
            INSERT INTO assessments (
              id, discipline_id, name, weight, due_on, sort_order, semester, kind
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
              discipline_id = EXCLUDED.discipline_id,
              name = EXCLUDED.name,
              weight = EXCLUDED.weight,
              due_on = EXCLUDED.due_on,
              sort_order = EXCLUDED.sort_order,
              semester = EXCLUDED.semester,
              kind = EXCLUDED.kind
          `,
          [
            assessmentId(key, slot.semester, slot.kind),
            IDS.disciplines[key],
            slot.kind,
            slot.weight,
            dueOnBySlot[key]?.[`${slot.semester}-${slot.kind}`] ?? null,
            slot.sortOrder,
            slot.semester,
            slot.kind,
          ],
        );
      }
    }

    for (const grade of grades) {
      await upsert(
        client,
        `
          INSERT INTO grades (id, enrollment_id, assessment_id, score)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE SET
            enrollment_id = EXCLUDED.enrollment_id,
            assessment_id = EXCLUDED.assessment_id,
            score = EXCLUDED.score
        `,
        [
          gradeId(grade.discipline, grade.semester, grade.kind),
          IDS.enrollments[grade.discipline],
          assessmentId(grade.discipline, grade.semester, grade.kind),
          grade.score,
        ],
      );
    }

    await client.query("COMMIT");
    console.log("Seed completed (fictitious development data).");
    console.log("Dev student (development only): amom.admin@central.local / admin123");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
