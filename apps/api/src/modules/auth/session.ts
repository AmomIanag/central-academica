import type { CookieOptions, Request } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { env } from "../../config/env";
import { pool } from "../../db/pool";
import { instrumentSessionStore, PERF_OP, wrapTimedMiddleware } from "../../lib/perf";

const PgSession = connectPgSimple(session);

export const SESSION_COOKIE_NAME = "central.sid";

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.nodeEnv === "production",
  path: "/",
};

const sessionStore = new PgSession({
  pool,
  tableName: "session",
  createTableIfMissing: false,
  pruneSessionInterval: env.nodeEnv === "test" ? false : 60 * 15,
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
