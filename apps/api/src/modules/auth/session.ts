import type { CookieOptions, Request } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { env } from "../../config/env";
import { pool } from "../../db/pool";
import { instrumentSessionStore, PERF_OP, wrapTimedMiddleware } from "../../lib/perf";

const PgSession = connectPgSimple(session);

export const SESSION_COOKIE_NAME = "central.sid";

// Absolute 24h from last store.set (login/regenerate/save). disableTouch prevents sliding
// DB TTL. Cookie maxAge matches that window; rolling is off so GET does not extend Set-Cookie.
export const SESSION_TTL_SECONDS = 60 * 60 * 24;
export const SESSION_COOKIE_MAX_AGE_MS = SESSION_TTL_SECONDS * 1000;
export const SESSION_DISABLE_TOUCH = true;

export function buildSessionCookieOptions(nodeEnv: string): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: nodeEnv === "production",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  };
}

export const sessionCookieOptions = buildSessionCookieOptions(env.nodeEnv);

export const sessionStore = new PgSession({
  pool,
  tableName: "session",
  createTableIfMissing: false,
  pruneSessionInterval: env.nodeEnv === "test" ? false : 60 * 15,
  ttl: SESSION_TTL_SECONDS,
  disableTouch: SESSION_DISABLE_TOUCH,
});

instrumentSessionStore(sessionStore);

export const sessionMiddleware = wrapTimedMiddleware(
  PERF_OP.sessionMiddleware,
  session({
    name: SESSION_COOKIE_NAME,
    secret: env.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    cookie: sessionCookieOptions,
  }),
);

export function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      resolve();
      return;
    }

    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
