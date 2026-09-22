import { Router } from "express";
import { pool } from "../../db/pool";
import { sendData, sendError } from "../../http/response";
import { requireAuth } from "../../middlewares/require-auth";
import { PERF_OP, timePerf } from "../../lib/perf";
import { loginAccountRateLimiter, loginIpRateLimiter } from "./login-rate-limit";
import { verifyPasswordOrDummy } from "./password";
import { loginSchema } from "./schema";
import {
  SESSION_COOKIE_NAME,
  destroySession,
  regenerateSession,
  saveSession,
  sessionCookieOptions,
} from "./session";

type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  ra: string | null;
  course_name: string | null;
  role: string;
};

function toPublicUser(row: Omit<UserRow, "password_hash">) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    ra: row.ra,
    courseName: row.course_name,
    role: row.role,
  };
}

export const authRouter = Router();

authRouter.post("/login", loginIpRateLimiter, loginAccountRateLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid request body.",
      parsed.error.flatten().fieldErrors,
    );
    return;
  }

  const { email, password } = parsed.data;
  const result = await pool.query<UserRow>(
    `
      SELECT id, name, email, password_hash, ra, course_name, role
      FROM users
      WHERE email = $1
    `,
    [email],
  );
  const user = result.rows[0] ?? null;
  const passwordMatches = await verifyPasswordOrDummy(password, user?.password_hash ?? null);

  if (!user || !passwordMatches) {
    sendError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password.");
    return;
  }

  await regenerateSession(req);
  req.session.userId = user.id;
  await saveSession(req);

  sendData(res, toPublicUser(user));
});

authRouter.post("/logout", async (req, res) => {
  await destroySession(req);
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
  sendData(res, { success: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const result = await timePerf(PERF_OP.authMeFindUser, () =>
    pool.query<Omit<UserRow, "password_hash">>(
      `
      SELECT id, name, email, ra, course_name, role
      FROM users
      WHERE id = $1
    `,
      [req.session.userId],
    ),
  );
  const user = result.rows[0];

  if (!user) {
    await destroySession(req);
    res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
    sendError(res, 401, "UNAUTHENTICATED", "Authentication required.");
    return;
  }

  sendData(res, toPublicUser(user));
});
