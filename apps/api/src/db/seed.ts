import { scryptSync } from "node:crypto";
import type { PoolClient } from "pg";
import { assertProjectDatabase } from "./assert-project-database";
import { pool } from "./pool";

assertProjectDatabase();

const DEV_PASSWORD = "dev-aluno-123";
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT = Buffer.from("central-acad-seed");

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

function assessmentId(disciplineKey: string, index: number): string {
  const map: Record<string, string> = {
    mobile: "01",
    ddd: "02",
    iot: "03",
    research: "04",
    java: "05",
  };

  return `a6666666-6666-4666-8666-00000000${map[disciplineKey]}${String(index).padStart(2, "0")}`;
}

function gradeId(disciplineKey: string, index: number): string {
  const map: Record<string, string> = {
    mobile: "01",
    ddd: "02",
    iot: "03",
    research: "04",
    java: "05",
  };

  return `a7777777-7777-4777-8777-00000000${map[disciplineKey]}${String(index).padStart(2, "0")}`;
}

function hashDevPassword(): string {
  const key = scryptSync(DEV_PASSWORD, SCRYPT_SALT, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${SCRYPT_SALT.toString("hex")}$${key.toString("hex")}`;
}

const assessments = [
  {
    discipline: "mobile" as const,
    items: [
      { name: "Checkpoint 1", weight: "0.2000", dueOn: "2026-03-10", sortOrder: 1 },
      { name: "Checkpoint 2", weight: "0.3000", dueOn: "2026-04-20", sortOrder: 2 },
      { name: "Challenge", weight: "0.5000", dueOn: "2026-06-15", sortOrder: 3 },
    ],
  },
  {
    discipline: "ddd" as const,
    items: [
      { name: "Checkpoint 1", weight: "0.2000", dueOn: "2026-03-12", sortOrder: 1 },
      { name: "Checkpoint 2", weight: "0.3000", dueOn: "2026-04-22", sortOrder: 2 },
      { name: "Challenge", weight: "0.5000", dueOn: "2026-06-16", sortOrder: 3 },
    ],
  },
  {
    discipline: "iot" as const,
    items: [
      { name: "Checkpoint 1", weight: "0.2000", dueOn: "2026-03-18", sortOrder: 1 },
      { name: "Checkpoint 2", weight: "0.3000", dueOn: "2026-05-05", sortOrder: 2 },
      { name: "Challenge", weight: "0.5000", dueOn: "2026-06-25", sortOrder: 3 },
    ],
  },
  {
    discipline: "research" as const,
    items: [
      { name: "Checkpoint 1", weight: "0.2000", dueOn: "2026-03-25", sortOrder: 1 },
      { name: "Checkpoint 2", weight: "0.3000", dueOn: "2026-05-12", sortOrder: 2 },
      { name: "Challenge", weight: "0.5000", dueOn: "2026-06-28", sortOrder: 3 },
    ],
  },
  {
    discipline: "java" as const,
    items: [
      { name: "Checkpoint 1", weight: "0.2000", dueOn: "2026-09-30", sortOrder: 1 },
      { name: "Checkpoint 2", weight: "0.3000", dueOn: "2026-10-20", sortOrder: 2 },
      { name: "Challenge", weight: "0.5000", dueOn: "2026-11-15", sortOrder: 3 },
    ],
  },
];

const grades: Array<{
  discipline: keyof typeof IDS.enrollments;
  assessmentIndex: number;
  score: string;
}> = [
  { discipline: "mobile", assessmentIndex: 1, score: "9.00" },
  { discipline: "mobile", assessmentIndex: 2, score: "8.00" },
  { discipline: "mobile", assessmentIndex: 3, score: "8.50" },
  { discipline: "ddd", assessmentIndex: 1, score: "4.00" },
  { discipline: "ddd", assessmentIndex: 2, score: "5.00" },
  { discipline: "ddd", assessmentIndex: 3, score: "5.50" },
  { discipline: "iot", assessmentIndex: 1, score: "8.00" },
  { discipline: "iot", assessmentIndex: 2, score: "7.50" },
  { discipline: "research", assessmentIndex: 1, score: "6.50" },
];

async function upsert(
  client: PoolClient,
  sql: string,
  values: unknown[],
): Promise<void> {
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
        "aluno@central.local",
        hashDevPassword(),
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
      [IDS.term, "2026-1", 2026, 1, "2026-02-02", "2026-07-15", true],
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

    const disciplines = [
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
          INSERT INTO disciplines (id, term_id, professor_id, code, name)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            term_id = EXCLUDED.term_id,
            professor_id = EXCLUDED.professor_id,
            code = EXCLUDED.code,
            name = EXCLUDED.name
        `,
        [id, IDS.term, professorId, code, name],
      );
    }

    const enrollmentPairs: Array<[string, string]> = [
      [IDS.enrollments.mobile, IDS.disciplines.mobile],
      [IDS.enrollments.ddd, IDS.disciplines.ddd],
      [IDS.enrollments.iot, IDS.disciplines.iot],
      [IDS.enrollments.research, IDS.disciplines.research],
      [IDS.enrollments.java, IDS.disciplines.java],
    ];

    for (const [id, disciplineId] of enrollmentPairs) {
      await upsert(
        client,
        `
          INSERT INTO enrollments (id, user_id, discipline_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            discipline_id = EXCLUDED.discipline_id
        `,
        [id, IDS.user, disciplineId],
      );
    }

    for (const group of assessments) {
      const disciplineId = IDS.disciplines[group.discipline];

      for (const [index, item] of group.items.entries()) {
        await upsert(
          client,
          `
            INSERT INTO assessments (id, discipline_id, name, weight, due_on, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
              discipline_id = EXCLUDED.discipline_id,
              name = EXCLUDED.name,
              weight = EXCLUDED.weight,
              due_on = EXCLUDED.due_on,
              sort_order = EXCLUDED.sort_order
          `,
          [
            assessmentId(group.discipline, index + 1),
            disciplineId,
            item.name,
            item.weight,
            item.dueOn,
            item.sortOrder,
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
          gradeId(grade.discipline, grade.assessmentIndex),
          IDS.enrollments[grade.discipline],
          assessmentId(grade.discipline, grade.assessmentIndex),
          grade.score,
        ],
      );
    }

    await client.query("COMMIT");
    console.log("Seed completed (fictitious development data).");
    console.log("Dev student: aluno@central.local / dev-aluno-123");
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
