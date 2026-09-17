import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { assertProjectDatabase } from "./assert-project-database";
import { pool } from "./pool";

assertProjectDatabase();

type CountRow = { count: string };

async function count(client: PoolClient, table: string): Promise<number> {
  const result = await client.query<CountRow>(`SELECT count(*)::text AS count FROM ${table}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function expectFailure(
  client: PoolClient,
  label: string,
  sql: string,
  values: unknown[],
): Promise<void> {
  await client.query("SAVEPOINT constraint_test");

  try {
    await client.query(sql, values);
  } catch {
    await client.query("ROLLBACK TO SAVEPOINT constraint_test");
    console.log(`OK constraint rejected: ${label}`);
    return;
  }

  await client.query("ROLLBACK TO SAVEPOINT constraint_test");
  throw new Error(`Expected constraint to reject: ${label}`);
}

async function verify(): Promise<void> {
  const client = await pool.connect();

  try {
    const tables = [
      "users",
      "terms",
      "professors",
      "disciplines",
      "enrollments",
      "assessments",
      "grades",
    ];

    console.log("Record counts:");
    for (const table of tables) {
      const total = await count(client, table);
      console.log(`- ${table}: ${total}`);
    }

    const currentTerms = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM terms WHERE is_current = true",
    );
    console.log(`- current terms: ${currentTerms.rows[0]?.count}`);

    const enrollments = await client.query(`
      SELECT u.name AS student, d.code, d.name AS discipline
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      JOIN disciplines d ON d.id = e.discipline_id
      ORDER BY d.code
    `);
    console.log("Student enrollments:", enrollments.rows);

    const withProfessors = await client.query(`
      SELECT d.code, d.name, p.name AS professor
      FROM disciplines d
      JOIN professors p ON p.id = d.professor_id
      ORDER BY d.code
    `);
    console.log("Disciplines and professors:", withProfessors.rows);

    const withAssessments = await client.query(`
      SELECT d.code, a.name, a.weight, a.due_on
      FROM assessments a
      JOIN disciplines d ON d.id = a.discipline_id
      ORDER BY d.code, a.sort_order
    `);
    console.log("Assessments:", withAssessments.rows);

    const withGrades = await client.query(`
      SELECT d.code, a.name AS assessment, g.score
      FROM grades g
      JOIN enrollments e ON e.id = g.enrollment_id
      JOIN disciplines d ON d.id = e.discipline_id
      JOIN assessments a ON a.id = g.assessment_id
      ORDER BY d.code, a.sort_order
    `);
    console.log("Grades:", withGrades.rows);

    await client.query("BEGIN");

    const enrollment = await client.query<{ id: string; discipline_id: string }>(
      "SELECT id, discipline_id FROM enrollments LIMIT 1",
    );
    const assessment = await client.query<{ id: string }>(
      "SELECT id FROM assessments WHERE discipline_id = $1 LIMIT 1",
      [enrollment.rows[0].discipline_id],
    );
    await expectFailure(
      client,
      "score above 10",
      `
        INSERT INTO grades (id, enrollment_id, assessment_id, score)
        VALUES ($1, $2, $3, 10.50)
      `,
      [randomUUID(), enrollment.rows[0].id, assessment.rows[0].id],
    );

    await expectFailure(
      client,
      "weight above 1",
      `
        INSERT INTO assessments (id, discipline_id, name, weight, sort_order)
        VALUES ($1, $2, 'Invalid', 1.1000, 99)
      `,
      [randomUUID(), enrollment.rows[0].discipline_id],
    );

    await expectFailure(
      client,
      "duplicate enrollment",
      `
        INSERT INTO enrollments (id, user_id, discipline_id)
        SELECT $1, user_id, discipline_id FROM enrollments WHERE id = $2
      `,
      [randomUUID(), enrollment.rows[0].id],
    );

    await expectFailure(
      client,
      "second current term",
      `
        INSERT INTO terms (id, label, year, semester, is_current)
        VALUES ($1, '2099-2', 2099, 2, true)
      `,
      [randomUUID()],
    );

    await expectFailure(
      client,
      "uppercase email",
      `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES ($1, 'Invalid', 'NotLower@central.local', 'x', 'student')
      `,
      [randomUUID()],
    );

    await client.query("ROLLBACK");
    console.log("Constraint checks rolled back; seed data left unchanged.");
  } finally {
    client.release();
  }
}

verify()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
