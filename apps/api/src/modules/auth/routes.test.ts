import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../app";
import { JSON_BODY_LIMIT_BYTES } from "../../config/http";
import { pool } from "../../db/pool";
import { SEED_EMAIL, SEED_PASSWORD } from "../../test/credentials";
import { withOrigin } from "../../test/http";
import { LOGIN_RATE_LIMIT, resetLoginRateLimiters } from "./login-rate-limit";
import { AUTH_PASSWORD_MAX_LENGTH, loginSchema } from "./schema";
import { SESSION_COOKIE_NAME } from "./session";

function isSessionExpireUpdate(sql: unknown): boolean {
  const text = typeof sql === "string" ? sql : "";
  return /UPDATE\s+"session"\s+SET\s+expire/i.test(text);
}

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
    expect(response.body).not.toHaveProperty("databaseUrl");
    expect(JSON.stringify(response.body)).not.toContain("postgresql://");
    expect(app.get("trust proxy")).toBe(false);
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
      email: "  Amom.Admin@Central.Local  ",
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
    expect(cookieHeader.toLowerCase()).not.toContain("max-age=");
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

  it("persists the session across authenticated GET requests without renewing store TTL", async () => {
    const agent = request.agent(app);
    await withOrigin(agent.post("/auth/login")).send({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
    });

    const stored = await pool.query<{ expire: Date; seconds: string }>(
      `
        SELECT expire, EXTRACT(EPOCH FROM (expire - CURRENT_TIMESTAMP))::int AS seconds
        FROM session
      `,
    );
    expect(stored.rows).toHaveLength(1);

    const expireAtLogin = stored.rows[0].expire.getTime();
    expect(Number(stored.rows[0].seconds)).toBeGreaterThan(23 * 60 * 60);
    expect(Number(stored.rows[0].seconds)).toBeLessThan(25 * 60 * 60);

    const querySpy = vi.spyOn(pool, "query");

    try {
      const first = await agent.get("/auth/me");
      const dashboard = await agent.get("/me/dashboard");
      const second = await agent.get("/auth/me");
      const sessionUpdates = querySpy.mock.calls.filter(([sql]) => isSessionExpireUpdate(sql));

      expect(first.status).toBe(200);
      expect(dashboard.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.data.email).toBe(SEED_EMAIL);
      expect(second.body.data.email).toBe(SEED_EMAIL);
      expect(sessionUpdates).toHaveLength(0);
    } finally {
      querySpy.mockRestore();
    }

    const afterGets = await pool.query<{ expire: Date }>("SELECT expire FROM session");
    expect(afterGets.rows).toHaveLength(1);
    expect(afterGets.rows[0].expire.getTime()).toBe(expireAtLogin);
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

    const remaining = await pool.query("SELECT sid FROM session");
    expect(remaining.rows).toHaveLength(0);
  });
});

const RATE_LIMITED_ERROR = {
  code: "TOO_MANY_REQUESTS",
  message: "Muitas tentativas de login. Tente novamente em instantes.",
};

async function sendLogin(email: string, password: string) {
  return withOrigin(request(app).post("/auth/login")).send({ email, password });
}

describe("login throttling", () => {
  afterEach(async () => {
    await resetLoginRateLimiters();
  });

  it("keeps a valid login working after unrelated failed attempts are reset", async () => {
    const failed = await sendLogin(SEED_EMAIL, "wrong-password");
    expect(failed.status).toBe(401);

    await resetLoginRateLimiters();

    const success = await sendLogin(SEED_EMAIL, SEED_PASSWORD);
    expect(success.status).toBe(200);
    expect(success.body.data.email).toBe(SEED_EMAIL);
  });

  it("returns 429 after repeated failed attempts against the same account", async () => {
    const responses = [];

    for (let attempt = 0; attempt < LOGIN_RATE_LIMIT.accountLimit; attempt += 1) {
      responses.push(await sendLogin(SEED_EMAIL, "wrong-password"));
    }

    const limited = await sendLogin(SEED_EMAIL, "wrong-password");
    const limitedExisting = await sendLogin(SEED_EMAIL, SEED_PASSWORD);

    expect(responses.every((response) => response.status === 401)).toBe(true);
    expect(limited.status).toBe(429);
    expect(limited.body.error).toEqual(RATE_LIMITED_ERROR);
    expect(limitedExisting.status).toBe(429);
    expect(limitedExisting.body.error).toEqual(RATE_LIMITED_ERROR);
  }, 60_000);

  it("applies the same limit to a nonexistent account without revealing that it is missing", async () => {
    const missingEmail = "missing.aluno@central.local";
    const responses = [];

    for (let attempt = 0; attempt < LOGIN_RATE_LIMIT.accountLimit; attempt += 1) {
      responses.push(await sendLogin(missingEmail, "wrong-password"));
    }

    const limitedMissing = await sendLogin(missingEmail, "wrong-password");
    const limitedExisting = await sendLogin(SEED_EMAIL, "wrong-password");

    expect(responses.every((response) => response.status === 401)).toBe(true);
    expect(limitedMissing.status).toBe(429);
    expect(limitedMissing.body.error).toEqual(RATE_LIMITED_ERROR);
    expect(limitedExisting.status).toBe(401);
    expect(limitedExisting.body.error).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    });
  }, 60_000);

  it("limits credential spraying from one origin after the IP threshold", async () => {
    const responses = [];

    for (let attempt = 0; attempt < LOGIN_RATE_LIMIT.ipLimit; attempt += 1) {
      responses.push(await sendLogin(`spray.${attempt}@central.local`, "wrong-password"));
    }

    const limited = await sendLogin("spray.last@central.local", "wrong-password");

    expect(responses.every((response) => response.status === 401)).toBe(true);
    expect(limited.status).toBe(429);
    expect(limited.body.error).toEqual(RATE_LIMITED_ERROR);
    expect(limited.body.error).not.toHaveProperty("details");
  }, 60_000);
});

describe("auth resource limits", () => {
  it("accepts a password at the maximum length and still authenticates with the generic contract", async () => {
    const response = await sendLogin(SEED_EMAIL, "p".repeat(AUTH_PASSWORD_MAX_LENGTH));

    expect(loginSchema.safeParse({ email: SEED_EMAIL, password: "p".repeat(AUTH_PASSWORD_MAX_LENGTH) }).success).toBe(
      true,
    );
    expect(response.status).toBe(401);
    expect(response.body.error).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    });
  });

  it("rejects a password beyond the maximum length", async () => {
    const response = await sendLogin(SEED_EMAIL, "p".repeat(AUTH_PASSWORD_MAX_LENGTH + 1));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details.password).toBeDefined();
  });

  it("rejects an oversized JSON body", async () => {
    const response = await withOrigin(request(app).post("/auth/login")).send({
      email: SEED_EMAIL,
      password: "p".repeat(JSON_BODY_LIMIT_BYTES),
    });

    expect(response.status).toBe(413);
    expect(response.body.error).toEqual({
      code: "PAYLOAD_TOO_LARGE",
      message: "O corpo da requisição excede o tamanho permitido.",
    });
  });
});
