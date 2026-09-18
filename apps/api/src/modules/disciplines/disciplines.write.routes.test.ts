import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../app";
import { pool } from "../../db/pool";
import { SEED_EMAIL, SEED_PASSWORD } from "../../test/credentials";
import { withOrigin } from "../../test/http";
import { hashPassword } from "../auth/password";

const MOBILE_ID = "a4444444-4444-4444-8444-000000000001";
const OTHER = {
  userId: "e1111111-1111-4111-8111-111111111111",
  email: "write.other@central.local",
  password: "other-dev-123",
  disciplineId: "e4444444-4444-4444-8444-000000000099",
  enrollmentId: "e5555555-5555-4555-8555-000000000099",
  professorId: "a3333333-3333-4333-8333-000000000001",
  termId: "a2222222-2222-4222-8222-222222222222",
};

async function login(email: string, password: string) {
  const agent = request.agent(app);
  const response = await withOrigin(agent.post("/auth/login")).send({ email, password });
  expect(response.status).toBe(200);
  return agent;
}

async function cleanupCreated(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  await pool.query("DELETE FROM tasks WHERE discipline_id = ANY($1::uuid[])", [ids]);
  await pool.query(
    `
      DELETE FROM grades
      WHERE enrollment_id IN (
        SELECT id FROM enrollments WHERE discipline_id = ANY($1::uuid[])
      )
    `,
    [ids],
  );
  await pool.query("DELETE FROM assessments WHERE discipline_id = ANY($1::uuid[])", [ids]);
  await pool.query("DELETE FROM enrollments WHERE discipline_id = ANY($1::uuid[])", [ids]);
  await pool.query("DELETE FROM disciplines WHERE id = ANY($1::uuid[])", [ids]);
}

async function cleanupOtherStudent(): Promise<void> {
  await cleanupCreated([OTHER.disciplineId]);
  await pool.query("DELETE FROM session WHERE sess::text LIKE $1", [`%${OTHER.userId}%`]);
  await pool.query("DELETE FROM users WHERE id = $1", [OTHER.userId]);
}

const createdIds: string[] = [];

afterEach(async () => {
  await cleanupCreated(createdIds.splice(0, createdIds.length));
  await pool.query("DELETE FROM session");
});

afterAll(async () => {
  await cleanupOtherStudent();
});

describe("academic write routes", () => {
  it("rejects mutations without a session", async () => {
    const response = await withOrigin(request(app).post("/me/disciplines")).send({
      name: "Banco de Dados",
      professorName: "Carlos Silva",
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects CSRF with a missing or invalid Origin", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const missing = await agent.post("/me/disciplines").send({
      name: "Banco de Dados",
      professorName: "Carlos Silva",
    });
    const invalid = await agent
      .post("/me/disciplines")
      .set("Origin", "http://evil.example")
      .send({
        name: "Banco de Dados",
        professorName: "Carlos Silva",
      });

    expect(missing.status).toBe(403);
    expect(invalid.status).toBe(403);
    expect(missing.body.error.code).toBe("CSRF_REJECTED");
    expect(invalid.body.error.code).toBe("CSRF_REJECTED");
  });

  it("creates a discipline for the authenticated student", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const response = await withOrigin(agent.post("/me/disciplines")).send({
      name: "Banco de Dados",
      professorName: "Carlos Silva",
    });

    expect(response.status).toBe(201);
    createdIds.push(response.body.data.id);
    expect(response.body.data).toMatchObject({
      name: "Banco de Dados",
      professor: { name: "Carlos Silva" },
      status: "EM_ANDAMENTO",
      mp: null,
      semester1: { cp: null, gs: null, md: null },
      semester2: { cp: null, gs: null, md: null },
    });
    expect(typeof response.body.data.code).toBe("string");
  });

  it("edits the name and swaps the professor without renaming a shared professor", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const created = await withOrigin(agent.post("/me/disciplines")).send({
      name: "Qualidade de Software",
      professorName: "Ana Souza",
    });
    createdIds.push(created.body.data.id);

    const anaId = created.body.data.professor.id;
    const renamed = await withOrigin(agent.patch(`/me/disciplines/${created.body.data.id}`)).send({
      name: "Qualidade de Software II",
      professorName: "Carlos Silva",
    });

    expect(renamed.status).toBe(200);
    expect(renamed.body.data.name).toBe("Qualidade de Software II");
    expect(renamed.body.data.professor.name).toBe("Carlos Silva");
    expect(renamed.body.data.professor.id).not.toBe(anaId);

    const ana = await pool.query<{ name: string }>("SELECT name FROM professors WHERE id = $1", [anaId]);
    expect(ana.rows[0]?.name).toBe("Ana Souza");

    const mobile = await agent.get(`/me/disciplines/${MOBILE_ID}`);
    expect(mobile.body.data.professor.name).toBe("Ana Souza");
  });

  it("posts, edits and clears grade slots using the official annual formula", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const created = await withOrigin(agent.post("/me/disciplines")).send({
      name: "Cálculo anual",
      professorName: "Elisa Ferreira",
    });
    const id = created.body.data.id as string;
    createdIds.push(id);

    const cp1 = await withOrigin(agent.patch(`/me/disciplines/${id}/grades`)).send({
      semester: 1,
      kind: "CP",
      score: 60,
    });
    expect(cp1.status).toBe(200);
    expect(cp1.body.data.semester1.cp).toBe(60);
    expect(cp1.body.data.status).toBe("EM_ANDAMENTO");

    const editedCp1 = await withOrigin(agent.patch(`/me/disciplines/${id}/grades`)).send({
      semester: 1,
      kind: "CP",
      score: 61,
    });
    expect(editedCp1.body.data.semester1.cp).toBe(61);

    const cleared = await withOrigin(agent.patch(`/me/disciplines/${id}/grades`)).send({
      semester: 1,
      kind: "CP",
      score: null,
    });
    expect(cleared.body.data.semester1.cp).toBeNull();
    expect(cleared.body.data.status).toBe("EM_ANDAMENTO");

    await withOrigin(agent.patch(`/me/disciplines/${id}/grades`)).send({
      semester: 1,
      kind: "CP",
      score: 60,
    });
    await withOrigin(agent.patch(`/me/disciplines/${id}/grades`)).send({
      semester: 1,
      kind: "GS",
      score: 80,
    });
    await withOrigin(agent.patch(`/me/disciplines/${id}/grades`)).send({
      semester: 2,
      kind: "CP",
      score: 70,
    });
    const complete = await withOrigin(agent.patch(`/me/disciplines/${id}/grades`)).send({
      semester: 2,
      kind: "GS",
      score: 100,
    });

    expect(complete.body.data).toMatchObject({
      semester1: { cp: 60, gs: 80, md: 72 },
      semester2: { cp: 70, gs: 100, md: 88 },
      mp: 81.6,
      status: "APROVADO_DIRETO",
    });
  });

  it("rejects scores outside 0–100 and extra payload fields", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const created = await withOrigin(agent.post("/me/disciplines")).send({
      name: "Validação",
      professorName: "Bruno Lima",
    });
    const id = created.body.data.id as string;
    createdIds.push(id);

    const tooLow = await withOrigin(agent.patch(`/me/disciplines/${id}/grades`)).send({
      semester: 1,
      kind: "CP",
      score: -0.01,
    });
    const tooHigh = await withOrigin(agent.patch(`/me/disciplines/${id}/grades`)).send({
      semester: 1,
      kind: "CP",
      score: 100.01,
    });
    const extra = await withOrigin(agent.patch(`/me/disciplines/${id}/grades`)).send({
      semester: 1,
      kind: "CP",
      score: 70,
      userId: "attacker",
    });
    const zero = await withOrigin(agent.patch(`/me/disciplines/${id}/grades`)).send({
      semester: 1,
      kind: "CP",
      score: 0,
    });
    const hundred = await withOrigin(agent.patch(`/me/disciplines/${id}/grades`)).send({
      semester: 1,
      kind: "GS",
      score: 100,
    });

    expect(tooLow.status).toBe(400);
    expect(tooHigh.status).toBe(400);
    expect(extra.status).toBe(400);
    expect(tooLow.body.error.code).toBe("VALIDATION_ERROR");
    expect(zero.body.data.semester1.cp).toBe(0);
    expect(hundred.body.data.semester1.gs).toBe(100);
  });

  it("saves attendance and derives the percentage", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const created = await withOrigin(agent.post("/me/disciplines")).send({
      name: "Presença",
      professorName: "Diego Martins",
    });
    const id = created.body.data.id as string;
    createdIds.push(id);

    const ok = await withOrigin(agent.patch(`/me/disciplines/${id}/attendance`)).send({
      totalClasses: 40,
      absences: 6,
    });
    const none = await withOrigin(agent.patch(`/me/disciplines/${id}/attendance`)).send({
      totalClasses: 0,
      absences: 0,
    });
    const overflow = await withOrigin(agent.patch(`/me/disciplines/${id}/attendance`)).send({
      totalClasses: 10,
      absences: 11,
    });
    const negative = await withOrigin(agent.patch(`/me/disciplines/${id}/attendance`)).send({
      totalClasses: -1,
      absences: 0,
    });

    expect(ok.body.data.attendance).toEqual({ totalClasses: 40, absences: 6, percentage: 85 });
    expect(none.body.data.attendance.percentage).toBeNull();
    expect(overflow.status).toBe(400);
    expect(negative.status).toBe(400);
  });

  it("deletes a discipline without dependents and blocks deletion when a task is linked", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const created = await withOrigin(agent.post("/me/disciplines")).send({
      name: "Removível",
      professorName: "Camila Rocha",
    });
    const id = created.body.data.id as string;
    createdIds.push(id);

    const task = await withOrigin(agent.post("/me/tasks")).send({
      title: "Trabalho da disciplina",
      disciplineId: id,
    });
    expect(task.status).toBe(201);

    const blocked = await withOrigin(agent.delete(`/me/disciplines/${id}`));
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("CONFLICT");

    await withOrigin(agent.delete(`/me/tasks/${task.body.data.id}`));
    const removed = await withOrigin(agent.delete(`/me/disciplines/${id}`));
    expect(removed.status).toBe(200);
    expect(removed.body.data.deleted).toBe(true);

    const missing = await agent.get(`/me/disciplines/${id}`);
    expect(missing.status).toBe(404);
  });

  it("does not let a student edit, grade or delete another student's discipline", async () => {
    await cleanupOtherStudent();
    await pool.query(
      `
        INSERT INTO users (id, name, email, password_hash, ra, course_name, role)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        OTHER.userId,
        "Outro Aluno",
        OTHER.email,
        hashPassword(OTHER.password),
        "RM777777",
        "Análise e Desenvolvimento de Sistemas",
        "student",
      ],
    );
    await pool.query(
      `
        INSERT INTO disciplines (id, term_id, professor_id, code, name, owner_user_id, academic_year)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [OTHER.disciplineId, OTHER.termId, OTHER.professorId, "9WRITX", "Foreign Write Discipline", OTHER.userId, 2026],
    );
    await pool.query(
      `
        INSERT INTO enrollments (id, user_id, discipline_id)
        VALUES ($1, $2, $3)
      `,
      [OTHER.enrollmentId, OTHER.userId, OTHER.disciplineId],
    );

    const seedAgent = await login(SEED_EMAIL, SEED_PASSWORD);
    const patch = await withOrigin(seedAgent.patch(`/me/disciplines/${OTHER.disciplineId}`)).send({
      name: "Hijacked",
    });
    const grade = await withOrigin(seedAgent.patch(`/me/disciplines/${OTHER.disciplineId}/grades`)).send({
      semester: 1,
      kind: "CP",
      score: 90,
    });
    const removed = await withOrigin(seedAgent.delete(`/me/disciplines/${OTHER.disciplineId}`));
    const invalidId = await withOrigin(seedAgent.patch("/me/disciplines/not-a-uuid")).send({
      name: "Nope",
    });
    const missing = await withOrigin(
      seedAgent.patch("/me/disciplines/00000000-0000-4000-8000-000000000000"),
    ).send({ name: "Nope" });

    expect(patch.status).toBe(404);
    expect(grade.status).toBe(404);
    expect(removed.status).toBe(404);
    expect(invalidId.status).toBe(400);
    expect(missing.status).toBe(404);

    const stillThere = await pool.query("SELECT name FROM disciplines WHERE id = $1", [OTHER.disciplineId]);
    expect(stillThere.rows[0]?.name).toBe("Foreign Write Discipline");

    await cleanupOtherStudent();
  });

  it("rejects extra fields on create", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const response = await withOrigin(agent.post("/me/disciplines")).send({
      name: "Extra",
      professorName: "Carlos Silva",
      userId: "a1111111-1111-4111-8111-111111111111",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
