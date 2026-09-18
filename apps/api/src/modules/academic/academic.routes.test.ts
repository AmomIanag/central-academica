import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../app";
import { pool } from "../../db/pool";
import { SEED_EMAIL, SEED_PASSWORD, SEED_USER_ID } from "../../test/credentials";
import { withOrigin } from "../../test/http";
import { hashPassword } from "../auth/password";

const MOBILE_ID = "a4444444-4444-4444-8444-000000000001";
const JAVA_ID = "a4444444-4444-4444-8444-000000000005";
const OTHER = {
  userId: "c1111111-1111-4111-8111-111111111111",
  email: "other.aluno@central.local",
  password: "other-dev-123",
  disciplineId: "c4444444-4444-4444-8444-000000000099",
  enrollmentId: "c5555555-5555-4555-8555-000000000099",
  professorId: "a3333333-3333-4333-8333-000000000001",
  termId: "a2222222-2222-4222-8222-222222222222",
};

function expectFiniteNumber(value: unknown): asserts value is number {
  expect(typeof value).toBe("number");
  expect(Number.isFinite(value)).toBe(true);
}

async function login(email: string, password: string) {
  const agent = request.agent(app);
  const response = await withOrigin(agent.post("/auth/login")).send({ email, password });
  expect(response.status).toBe(200);
  return agent;
}

async function cleanupOtherStudent(): Promise<void> {
  await pool.query("DELETE FROM grades WHERE enrollment_id = $1", [OTHER.enrollmentId]);
  await pool.query("DELETE FROM assessments WHERE discipline_id = $1", [OTHER.disciplineId]);
  await pool.query("DELETE FROM enrollments WHERE id = $1", [OTHER.enrollmentId]);
  await pool.query("DELETE FROM disciplines WHERE id = $1", [OTHER.disciplineId]);
  await pool.query("DELETE FROM session");
  await pool.query("DELETE FROM users WHERE id = $1", [OTHER.userId]);
}

afterEach(async () => {
  await pool.query("DELETE FROM session");
});

afterAll(async () => {
  await cleanupOtherStudent();
});

describe("academic routes", () => {
  it("rejects GET /me/disciplines without a session", async () => {
    const response = await request(app).get("/me/disciplines");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects GET /me/dashboard without a session", async () => {
    const response = await request(app).get("/me/dashboard");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("lists the seed student's annual disciplines with derived MD/MP values", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const response = await agent.get("/me/disciplines");

    expect(response.status).toBe(200);
    expect(response.body.data.map((item: { code: string }) => item.code)).toEqual([
      "2TDSPD",
      "2TDSPG",
      "2TDSPI",
      "2TDSPJ",
      "2TDSPK",
    ]);

    const byCode = Object.fromEntries(
      response.body.data.map((item: { code: string }) => [item.code, item]),
    );

    expect(byCode["2TDSPJ"]).toMatchObject({
      id: MOBILE_ID,
      name: "Mobile Application Development",
      status: "APROVADO_DIRETO",
      professor: { name: "Ana Souza" },
      semester1: { cp: 60, gs: 80, md: 72 },
      semester2: { cp: 70, gs: 100, md: 88 },
      mp: 81.6,
      attendance: { totalClasses: 40, absences: 6, percentage: 85 },
    });
    expectFiniteNumber(byCode["2TDSPJ"].mp);

    expect(byCode["2TDSPD"]).toMatchObject({
      status: "REPROVADO_DIRETO",
      mp: 26.4,
      semester1: { md: 24 },
      semester2: { md: 28 },
    });
    expect(byCode["2TDSPI"]).toMatchObject({
      status: "EM_ANDAMENTO",
      mp: null,
      semester1: { cp: 80, gs: 75, md: 77 },
      semester2: { md: null },
    });
    expect(byCode["2TDSPG"]).toMatchObject({ status: "EXAME", mp: 57.2 });
    expect(byCode["2TDSPK"]).toMatchObject({
      status: "EM_ANDAMENTO",
      mp: null,
      semester1: { cp: null, gs: null, md: null },
    });
    expect(byCode["2TDSPK"]).not.toHaveProperty("assessments");
  });

  it("returns discipline detail with semester slots and numeric scores", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const mobile = await agent.get(`/me/disciplines/${MOBILE_ID}`);
    const java = await agent.get(`/me/disciplines/${JAVA_ID}`);

    expect(mobile.status).toBe(200);
    expect(mobile.body.data).toMatchObject({
      id: MOBILE_ID,
      code: "2TDSPJ",
      status: "APROVADO_DIRETO",
      mp: 81.6,
      term: { label: "2026" },
      semester1: { cp: 60, gs: 80, md: 72 },
      semester2: { cp: 70, gs: 100, md: 88 },
    });
    expectFiniteNumber(mobile.body.data.semester1.cp);
    expectFiniteNumber(mobile.body.data.mp);

    expect(java.status).toBe(200);
    expect(java.body.data.mp).toBeNull();
    expect(java.body.data.status).toBe("EM_ANDAMENTO");
    expect(java.body.data.semester1.cp).toBeNull();
    expect(java.body.data.semester2.gs).toBeNull();
  });

  it("rejects an invalid discipline id with VALIDATION_ERROR", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const response = await agent.get("/me/disciplines/not-a-uuid");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns the same NOT_FOUND for a missing discipline and one that belongs to another student", async () => {
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
        await hashPassword(OTHER.password),
        "RM999999",
        "Análise e Desenvolvimento de Sistemas",
        "student",
      ],
    );
    await pool.query(
      `
        INSERT INTO disciplines (id, term_id, professor_id, code, name, owner_user_id, academic_year)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [OTHER.disciplineId, OTHER.termId, OTHER.professorId, "9TESTX", "Isolation Discipline", OTHER.userId, 2026],
    );
    await pool.query(
      `
        INSERT INTO enrollments (id, user_id, discipline_id)
        VALUES ($1, $2, $3)
      `,
      [OTHER.enrollmentId, OTHER.userId, OTHER.disciplineId],
    );

    const seedAgent = await login(SEED_EMAIL, SEED_PASSWORD);
    const otherAgent = await login(OTHER.email, OTHER.password);
    const missingId = "00000000-0000-4000-8000-000000000000";

    const missing = await seedAgent.get(`/me/disciplines/${missingId}`);
    const foreign = await seedAgent.get(`/me/disciplines/${OTHER.disciplineId}`);
    const seedList = await seedAgent.get("/me/disciplines");
    const otherList = await otherAgent.get("/me/disciplines");
    const otherLookingAtSeed = await otherAgent.get(`/me/disciplines/${MOBILE_ID}`);

    expect(missing.status).toBe(404);
    expect(foreign.status).toBe(404);
    expect(foreign.body.error).toEqual(missing.body.error);
    expect(foreign.body.error.code).toBe("NOT_FOUND");
    expect(seedList.body.data.some((item: { id: string }) => item.id === OTHER.disciplineId)).toBe(false);
    expect(otherList.body.data).toEqual([
      expect.objectContaining({
        id: OTHER.disciplineId,
        code: "9TESTX",
      }),
    ]);
    expect(otherLookingAtSeed.status).toBe(404);
    expect(otherLookingAtSeed.body.error).toEqual(missing.body.error);

    await cleanupOtherStudent();
  });

  it("returns a compact dashboard with annual MP and the new status summary", async () => {
    const agent = await login(SEED_EMAIL, SEED_PASSWORD);
    const response = await agent.get("/me/dashboard");

    expect(response.status).toBe(200);
    expect(response.body.data.student).toEqual({
      id: SEED_USER_ID,
      name: "Aluno Teste",
      ra: "RM000000",
      courseName: "Análise e Desenvolvimento de Sistemas",
    });
    expect(response.body.data.term).toMatchObject({
      id: "a2222222-2222-4222-8222-222222222222",
      label: "2026",
    });
    expect(response.body.data.disciplineCount).toBe(5);
    expect(response.body.data.statusSummary).toEqual({
      inProgress: 2,
      approved: 1,
      exam: 1,
      failed: 1,
    });
    expectFiniteNumber(response.body.data.overallAverage);
    expect(response.body.data.overallAverage).toBe(55.07);
    expect(response.body.data.upcomingAssessments).toHaveLength(5);
    expect(response.body.data.upcomingAssessments.map((item: { dueOn: string }) => item.dueOn)).toEqual([
      "2026-06-25",
      "2026-06-28",
      "2026-09-30",
      "2026-10-20",
      "2026-11-15",
    ]);
    expect(response.body.data.upcomingAssessments[0]).toMatchObject({
      name: "CP",
      discipline: { code: "2TDSPI" },
    });
  });
});
