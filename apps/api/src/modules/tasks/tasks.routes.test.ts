import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../app";
import { pool } from "../../db/pool";
import { hashPassword } from "../auth/password";
import { TEST_ORIGIN, withOrigin } from "../../test/http";

const SEED_EMAIL = "aluno@central.local";
const SEED_PASSWORD = "dev-aluno-123";
const MOBILE_ID = "a4444444-4444-4444-8444-000000000001";
const JAVA_ID = "a4444444-4444-4444-8444-000000000005";
const TZ = "America/Sao_Paulo";
const OTHER = {
  userId: "d1111111-1111-4111-8111-111111111111",
  email: "tasks.other@central.local",
  password: "other-dev-123",
  disciplineId: "d4444444-4444-4444-8444-000000000099",
  enrollmentId: "d5555555-5555-4555-8555-000000000099",
  professorId: "a3333333-3333-4333-8333-000000000001",
  termId: "a2222222-2222-4222-8222-222222222222",
};

async function login(email: string, password: string) {
  const agent = request.agent(app);
  const response = await withOrigin(agent.post("/auth/login")).send({ email, password });
  expect(response.status).toBe(200);
  return agent;
}

async function cleanupOtherStudent(): Promise<void> {
  await pool.query("DELETE FROM tasks WHERE user_id = $1", [OTHER.userId]);
  await pool.query("DELETE FROM enrollments WHERE id = $1", [OTHER.enrollmentId]);
  await pool.query("DELETE FROM disciplines WHERE id = $1", [OTHER.disciplineId]);
  await pool.query("DELETE FROM users WHERE id = $1", [OTHER.userId]);
}

async function ensureOtherStudent(): Promise<void> {
  await cleanupOtherStudent();
  await pool.query(
    `
      INSERT INTO users (id, name, email, password_hash, ra, course_name, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      OTHER.userId,
      "Outro Aluno Tasks",
      OTHER.email,
      hashPassword(OTHER.password),
      "RM888888",
      "Análise e Desenvolvimento de Sistemas",
      "student",
    ],
  );
  await pool.query(
    `
      INSERT INTO disciplines (id, term_id, professor_id, code, name)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [OTHER.disciplineId, OTHER.termId, OTHER.professorId, "9TSKXX", "Foreign Task Discipline"],
  );
  await pool.query(
    `
      INSERT INTO enrollments (id, user_id, discipline_id)
      VALUES ($1, $2, $3)
    `,
    [OTHER.enrollmentId, OTHER.userId, OTHER.disciplineId],
  );
}

afterAll(async () => {
  await cleanupOtherStudent();
});

describe("task routes", () => {
  it("rejects GET /me/tasks without a session", async () => {
    const response = await request(app).get("/me/tasks");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("creates a minimal pending task with default priority and no due date", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const response = await withOrigin(agent.post("/me/tasks")).send({ title: "Ler capítulo 2" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      title: "Ler capítulo 2",
      description: null,
      priority: "normal",
      discipline: null,
      due: null,
      status: "pending",
      overdue: false,
      completedAt: null,
    });
    expect(response.body.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("creates a complete task with discipline, description, high priority and date+time", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const response = await withOrigin(agent.post("/me/tasks")).send({
      title: "Entregar challenge",
      description: "Revisar README e gravar vídeo.",
      priority: "high",
      disciplineId: MOBILE_ID,
      due: { kind: "datetime", at: "2026-09-20T18:30:00-03:00" },
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      title: "Entregar challenge",
      description: "Revisar README e gravar vídeo.",
      priority: "high",
      status: "pending",
      discipline: { id: MOBILE_ID, code: "2TDSPJ" },
      due: { kind: "datetime", at: "2026-09-20T21:30:00.000Z" },
    });
  });

  it("creates a task without a deadline", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const response = await withOrigin(agent.post("/me/tasks")).send({
      title: "Organizar pastas",
      due: null,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.due).toBeNull();
    expect(response.body.data.overdue).toBe(false);
  });

  it("creates a task without a discipline", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const response = await withOrigin(agent.post("/me/tasks")).send({
      title: "Comprar caderno",
      disciplineId: null,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.discipline).toBeNull();
  });

  it("rejects an empty title", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const response = await withOrigin(agent.post("/me/tasks")).send({ title: "   " });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects title and description length limits", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const longTitle = await withOrigin(agent.post("/me/tasks")).send({ title: "a".repeat(161) });
    const longDescription = await withOrigin(agent.post("/me/tasks")).send({
      title: "ok",
      description: "d".repeat(4001),
    });

    expect(longTitle.status).toBe(400);
    expect(longDescription.status).toBe(400);
    expect(longTitle.body.error.code).toBe("VALIDATION_ERROR");
    expect(longDescription.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid priority", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const response = await withOrigin(agent.post("/me/tasks")).send({
      title: "X",
      priority: "urgent",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid due payload", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const invalidDate = await withOrigin(agent.post("/me/tasks")).send({
      title: "X",
      due: { kind: "date", date: "2026-09-31" },
    });
    const invalidDateTime = await withOrigin(agent.post("/me/tasks")).send({
      title: "X",
      due: { kind: "datetime", at: "not-a-date" },
    });
    const mixed = await withOrigin(agent.post("/me/tasks")).send({
      title: "X",
      due: { kind: "date", date: "2026-09-20", at: "2026-09-20T18:30:00-03:00" },
    });

    expect(invalidDate.status).toBe(400);
    expect(invalidDateTime.status).toBe(400);
    expect(mixed.status).toBe(400);
    expect(invalidDate.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("preserves a civil date exactly and does not coerce it to UTC midnight", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const created = await withOrigin(agent.post("/me/tasks")).send({
      title: "Checkpoint",
      due: { kind: "date", date: "2026-09-20" },
    });

    expect(created.status).toBe(201);
    expect(created.body.data.due).toEqual({ kind: "date", date: "2026-09-20" });

    const stored = await pool.query<{ due_on: string; due_at: Date | null }>(
      `SELECT to_char(due_on, 'YYYY-MM-DD') AS due_on, due_at FROM tasks WHERE id = $1`,
      [created.body.data.id],
    );

    expect(stored.rows[0].due_on).toBe("2026-09-20");
    expect(stored.rows[0].due_at).toBeNull();
  });

  it("accepts a datetime with offset and returns ISO UTC", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const response = await withOrigin(agent.post("/me/tasks")).send({
      title: "Call",
      due: { kind: "datetime", at: "2026-09-20T18:30:00-03:00" },
    });

    expect(response.status).toBe(201);
    expect(response.body.data.due).toEqual({
      kind: "datetime",
      at: "2026-09-20T21:30:00.000Z",
    });
  });

  it("filters by status, priority and discipline", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const pendingHigh = await withOrigin(agent.post("/me/tasks")).send({
      title: "Alta pendente",
      priority: "high",
      disciplineId: MOBILE_ID,
    });
    const pendingLow = await withOrigin(agent.post("/me/tasks")).send({
      title: "Baixa pendente",
      priority: "low",
      disciplineId: JAVA_ID,
    });
    const completed = await withOrigin(agent.post("/me/tasks")).send({
      title: "Concluída",
      priority: "high",
      disciplineId: MOBILE_ID,
    });
    await withOrigin(agent.post(`/me/tasks/${completed.body.data.id}/complete`)).send();

    const pending = await agent.get("/me/tasks").query({ status: "pending" });
    const completedList = await agent.get("/me/tasks").query({ status: "completed" });
    const high = await agent.get("/me/tasks").query({ priority: "high" });
    const mobile = await agent.get("/me/tasks").query({ disciplineId: MOBILE_ID });

    expect(pending.body.data.map((item: { title: string }) => item.title)).toEqual(
      expect.arrayContaining(["Alta pendente", "Baixa pendente"]),
    );
    expect(pending.body.data.map((item: { title: string }) => item.title)).not.toContain("Concluída");
    expect(completedList.body.data).toEqual([
      expect.objectContaining({ id: completed.body.data.id, status: "completed" }),
    ]);
    expect(high.body.data.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([pendingHigh.body.data.id, completed.body.data.id]),
    );
    expect(high.body.data.map((item: { id: string }) => item.id)).not.toContain(pendingLow.body.data.id);
    expect(mobile.body.data.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([pendingHigh.body.data.id, completed.body.data.id]),
    );
    expect(mobile.body.data.map((item: { id: string }) => item.id)).not.toContain(pendingLow.body.data.id);
  });

  it("filters an agenda interval and excludes tasks without a due date", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const inRangeDate = await withOrigin(agent.post("/me/tasks")).send({
      title: "No dia",
      due: { kind: "date", date: "2026-09-20" },
    });
    const inRangeDateTime = await withOrigin(agent.post("/me/tasks")).send({
      title: "No horário",
      due: { kind: "datetime", at: "2026-09-20T18:30:00-03:00" },
    });
    const outside = await withOrigin(agent.post("/me/tasks")).send({
      title: "Fora",
      due: { kind: "date", date: "2026-09-22" },
    });
    const undated = await withOrigin(agent.post("/me/tasks")).send({
      title: "Sem prazo",
    });

    const response = await agent.get("/me/tasks").query({
      from: "2026-09-20",
      to: "2026-09-20",
      timeZone: TZ,
    });
    const ids = response.body.data.map((item: { id: string }) => item.id);

    expect(ids).toEqual(
      expect.arrayContaining([inRangeDate.body.data.id, inRangeDateTime.body.data.id]),
    );
    expect(ids).not.toContain(outside.body.data.id);
    expect(ids).not.toContain(undated.body.data.id);
  });

  it("completes a task idempotently and reopens it idempotently", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const created = await withOrigin(agent.post("/me/tasks")).send({ title: "Ciclo" });
    const id = created.body.data.id;

    const firstComplete = await withOrigin(agent.post(`/me/tasks/${id}/complete`)).send();
    const secondComplete = await withOrigin(agent.post(`/me/tasks/${id}/complete`)).send();
    const firstReopen = await withOrigin(agent.post(`/me/tasks/${id}/reopen`)).send();
    const secondReopen = await withOrigin(agent.post(`/me/tasks/${id}/reopen`)).send();

    expect(firstComplete.status).toBe(200);
    expect(firstComplete.body.data.status).toBe("completed");
    expect(firstComplete.body.data.completedAt).toEqual(expect.any(String));
    expect(secondComplete.status).toBe(200);
    expect(secondComplete.body.data.completedAt).toBe(firstComplete.body.data.completedAt);
    expect(firstReopen.body.data).toMatchObject({ status: "pending", completedAt: null });
    expect(secondReopen.body.data).toMatchObject({ status: "pending", completedAt: null });
  });

  it("edits allowed fields and can clear optional ones", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const created = await withOrigin(agent.post("/me/tasks")).send({
      title: "Original",
      description: "Texto",
      priority: "low",
      disciplineId: MOBILE_ID,
      due: { kind: "date", date: "2026-09-20" },
    });
    const patched = await withOrigin(agent.patch(`/me/tasks/${created.body.data.id}`)).send({
      title: "Atualizado",
      description: null,
      priority: "high",
      disciplineId: null,
      due: null,
    });
    const rejected = await withOrigin(agent.patch(`/me/tasks/${created.body.data.id}`)).send({
      title: "Nope",
      completedAt: "2026-09-20T00:00:00.000Z",
    });

    expect(patched.status).toBe(200);
    expect(patched.body.data).toMatchObject({
      title: "Atualizado",
      description: null,
      priority: "high",
      discipline: null,
      due: null,
      status: "pending",
    });
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("hard-deletes a task", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const created = await withOrigin(agent.post("/me/tasks")).send({ title: "Apagar" });
    const deleted = await withOrigin(agent.delete(`/me/tasks/${created.body.data.id}`));
    const missing = await agent.get(`/me/tasks/${created.body.data.id}`);

    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ data: { deleted: true } });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });

  it("does not leak another student's tasks across read and mutation operations", async () => {
    await ensureOtherStudent();
    const seedAgent = await login(SEED_EMAIL, SEED_PASSWORD);
    const otherAgent = await login(OTHER.email, OTHER.password);
    const mine = await withOrigin(seedAgent.post("/me/tasks")).send({ title: "Minha" });
    const foreign = await withOrigin(otherAgent.post("/me/tasks")).send({
      title: "Alheia",
      disciplineId: OTHER.disciplineId,
    });
    const missingId = "00000000-0000-4000-8000-000000000000";

    const missing = await seedAgent.get(`/me/tasks/${missingId}`);
    const readForeign = await seedAgent.get(`/me/tasks/${foreign.body.data.id}`);
    const patchForeign = await withOrigin(seedAgent.patch(`/me/tasks/${foreign.body.data.id}`)).send({
      title: "Hack",
    });
    const completeForeign = await withOrigin(
      seedAgent.post(`/me/tasks/${foreign.body.data.id}/complete`),
    ).send();
    const reopenForeign = await withOrigin(
      seedAgent.post(`/me/tasks/${foreign.body.data.id}/reopen`),
    ).send();
    const deleteForeign = await withOrigin(seedAgent.delete(`/me/tasks/${foreign.body.data.id}`));
    const seedList = await seedAgent.get("/me/tasks");
    const stillThere = await otherAgent.get(`/me/tasks/${foreign.body.data.id}`);

    expect(missing.status).toBe(404);
    expect(readForeign.status).toBe(404);
    expect(readForeign.body.error).toEqual(missing.body.error);
    expect(patchForeign.status).toBe(404);
    expect(completeForeign.status).toBe(404);
    expect(reopenForeign.status).toBe(404);
    expect(deleteForeign.status).toBe(404);
    expect(seedList.body.data.some((item: { id: string }) => item.id === foreign.body.data.id)).toBe(
      false,
    );
    expect(seedList.body.data.some((item: { id: string }) => item.id === mine.body.data.id)).toBe(true);
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.data.title).toBe("Alheia");

    await cleanupOtherStudent();
  });

  it("rejects an invalid discipline id and hides unenrolled disciplines as NOT_FOUND", async () => {
    await ensureOtherStudent();
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const invalid = await withOrigin(agent.post("/me/tasks")).send({
      title: "X",
      disciplineId: "not-a-uuid",
    });
    const unenrolled = await withOrigin(agent.post("/me/tasks")).send({
      title: "X",
      disciplineId: OTHER.disciplineId,
    });
    const unknown = await withOrigin(agent.post("/me/tasks")).send({
      title: "X",
      disciplineId: "00000000-0000-4000-8000-000000000000",
    });

    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
    expect(unenrolled.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(unenrolled.body.error).toEqual(unknown.body.error);
    expect(unenrolled.body.error.code).toBe("NOT_FOUND");

    await cleanupOtherStudent();
  });

  it("requires a trusted Origin on mutations and ignores Origin on GET", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const valid = await withOrigin(agent.post("/me/tasks")).send({ title: "Com origin" });
    const invalidOrigin = await agent.post("/me/tasks").set("Origin", "http://evil.example").send({
      title: "Evil",
    });
    const missingOrigin = await agent.post("/me/tasks").send({ title: "Sem origin" });
    const list = await agent.get("/me/tasks");

    expect(valid.status).toBe(201);
    expect(invalidOrigin.status).toBe(403);
    expect(invalidOrigin.body.error.code).toBe("CSRF_REJECTED");
    expect(missingOrigin.status).toBe(403);
    expect(missingOrigin.body.error.code).toBe("CSRF_REJECTED");
    expect(list.status).toBe(200);
  });

  it("returns summary counts for pending, overdue and upcoming tasks", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    await withOrigin(agent.post("/me/tasks")).send({ title: "Sem prazo" });
    await withOrigin(agent.post("/me/tasks")).send({
      title: "Vencida",
      due: { kind: "date", date: "2020-01-15" },
    });
    const next = await withOrigin(agent.post("/me/tasks")).send({
      title: "Próxima",
      due: { kind: "date", date: "2099-01-15" },
    });
    const later = await withOrigin(agent.post("/me/tasks")).send({
      title: "Depois",
      due: { kind: "datetime", at: "2099-02-01T18:00:00-03:00" },
    });
    await withOrigin(agent.post("/me/tasks")).send({
      title: "Já feita",
      due: { kind: "date", date: "2020-01-01" },
    }).then(async (created) => {
      await withOrigin(agent.post(`/me/tasks/${created.body.data.id}/complete`)).send();
    });

    const summary = await agent.get("/me/tasks/summary").query({ timeZone: TZ });

    expect(summary.status).toBe(200);
    expect(summary.body.data.pendingCount).toBe(4);
    expect(summary.body.data.overdueCount).toBe(1);
    expect(summary.body.data.upcoming.map((item: { title: string }) => item.title)).toEqual([
      "Vencida",
      "Próxima",
      "Depois",
    ]);
    expect(summary.body.data.upcoming[1].id).toBe(next.body.data.id);
    expect(summary.body.data.upcoming[2].id).toBe(later.body.data.id);
  });

  it("derives overdue for pending dated tasks and never for undated ones", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const overdue = await withOrigin(agent.post("/me/tasks")).send({
      title: "Atrasada",
      due: { kind: "date", date: "2020-05-01" },
    });
    const undated = await withOrigin(agent.post("/me/tasks")).send({ title: "Sem data" });
    const overdueDetail = await agent.get(`/me/tasks/${overdue.body.data.id}`).query({ timeZone: TZ });
    const undatedDetail = await agent.get(`/me/tasks/${undated.body.data.id}`).query({ timeZone: TZ });

    expect(overdueDetail.body.data.overdue).toBe(true);
    expect(overdueDetail.body.data.status).toBe("pending");
    expect(undatedDetail.body.data.overdue).toBe(false);
  });
});

describe("auth CSRF", () => {
  it("rejects login and logout without a trusted Origin", async () => {
    const missing = await request(app).post("/auth/login").send({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
    });
    const invalid = await request(app)
      .post("/auth/login")
      .set("Origin", "https://attacker.example")
      .send({
        email: SEED_EMAIL,
        password: SEED_PASSWORD,
      });
    const valid = await request(app)
      .post("/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({
        email: SEED_EMAIL,
        password: SEED_PASSWORD,
      });
    const logoutMissing = await request(app).post("/auth/logout");

    expect(missing.status).toBe(403);
    expect(missing.body.error.code).toBe("CSRF_REJECTED");
    expect(invalid.status).toBe(403);
    expect(valid.status).toBe(200);
    expect(logoutMissing.status).toBe(403);
    expect(logoutMissing.body.error.code).toBe("CSRF_REJECTED");
  });
});
