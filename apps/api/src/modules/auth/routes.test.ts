import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../app";
import { pool } from "../../db/pool";
import { withOrigin } from "../../test/http";
import { SESSION_COOKIE_NAME } from "./session";

const SEED_EMAIL = "aluno@central.local";
const SEED_PASSWORD = "dev-aluno-123";

afterEach(async () => {
  await pool.query("DELETE FROM session");
});

describe("auth routes", () => {
  it("keeps GET /health public", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      database: "reachable",
    });
  });

  it("returns the JSON error envelope for unknown routes", async () => {
    const response = await request(app).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: "NOT_FOUND",
      message: "Route not found.",
    });
  });

  it("rejects invalid login bodies with the error contract", async () => {
    const invalidEmail = await withOrigin(request(app).post("/auth/login")).send({
      email: "not-an-email",
      password: SEED_PASSWORD,
    });
    const missingPassword = await withOrigin(request(app).post("/auth/login")).send({
      email: SEED_EMAIL,
    });

    expect(invalidEmail.status).toBe(400);
    expect(invalidEmail.body.error.code).toBe("VALIDATION_ERROR");
    expect(invalidEmail.body.error.message).toBe("Invalid request body.");
    expect(invalidEmail.body.error.details.email).toBeDefined();

    expect(missingPassword.status).toBe(400);
    expect(missingPassword.body.error.code).toBe("VALIDATION_ERROR");
    expect(missingPassword.body.error.details.password).toBeDefined();
  });

  it("does not distinguish unknown email from a wrong password", async () => {
    const unknownEmail = await withOrigin(request(app).post("/auth/login")).send({
      email: "nobody@central.local",
      password: SEED_PASSWORD,
    });
    const wrongPassword = await withOrigin(request(app).post("/auth/login")).send({
      email: SEED_EMAIL,
      password: "wrong-password",
    });

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.body.error).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    });
    expect(wrongPassword.body.error).toEqual(unknownEmail.body.error);
    expect(unknownEmail.headers["set-cookie"]).toBeUndefined();
    expect(wrongPassword.headers["set-cookie"]).toBeUndefined();
  });

  it("logs in the seed student, regenerates the session, and omits the password hash", async () => {
    const response = await withOrigin(
      request(app)
        .post("/auth/login")
        .set("Cookie", `${SESSION_COOKIE_NAME}=s%3Aattacker-session.signature`),
    ).send({
      email: "  Aluno@Central.Local  ",
      password: SEED_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: "a1111111-1111-4111-8111-111111111111",
      name: "Aluno Teste",
      email: SEED_EMAIL,
      ra: "RM000000",
      courseName: "Análise e Desenvolvimento de Sistemas",
      role: "student",
    });
    expect(response.body.data).not.toHaveProperty("passwordHash");
    expect(response.body.data).not.toHaveProperty("password_hash");

    const setCookie = response.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);

    expect(cookieHeader).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader.toLowerCase()).toContain("samesite=lax");
    expect(cookieHeader.toLowerCase()).toContain("path=/");
    expect(cookieHeader).not.toContain("attacker-session");
  });

  it("requires a session for GET /auth/me and returns the current user", async () => {
    const anonymous = await request(app).get("/auth/me");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe("UNAUTHENTICATED");

    const agent = request.agent(app);
    await withOrigin(agent.post("/auth/login")).send({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
    });

    const me = await agent.get("/auth/me");

    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(SEED_EMAIL);
    expect(me.body.data).not.toHaveProperty("password_hash");
    expect(me.body.data).not.toHaveProperty("passwordHash");
  });

  it("destroys the session and clears the cookie on logout", async () => {
    const agent = request.agent(app);
    await withOrigin(agent.post("/auth/login")).send({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
    });

    const logout = await withOrigin(agent.post("/auth/logout"));
    const me = await agent.get("/auth/me");
    const logoutCookie = logout.headers["set-cookie"];
    const cookieHeader = Array.isArray(logoutCookie) ? logoutCookie.join(";") : String(logoutCookie);

    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ data: { success: true } });
    expect(cookieHeader).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe("UNAUTHENTICATED");
  });
});
