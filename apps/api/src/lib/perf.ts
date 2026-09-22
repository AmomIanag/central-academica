import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Pool, PoolClient } from "pg";
import type { SessionData, Store } from "express-session";
import { parsePerfLogging } from "../config/runtime";

export const PERF_LOG_PREFIX = "[PERF]";

export const PERF_OP = {
  requestTotal: "request.total",
  sessionMiddleware: "session.middleware",
  sessionStoreGet: "session.store.get",
  poolAcquire: "db.pool.acquire",
  authMeFindUser: "auth.me.findUser",
  dashboardHandler: "dashboard.handler",
  dashboardFindStudent: "dashboard.findStudent",
  dashboardFindCurrentTerm: "dashboard.findCurrentTerm",
  dashboardListUpcomingAssessments: "dashboard.listUpcomingAssessments",
  dashboardParallelQueries: "dashboard.parallelQueries",
  disciplinesListCurrentEnrollments: "disciplines.listCurrentEnrollments",
} as const;

export type PerfOperation = (typeof PERF_OP)[keyof typeof PERF_OP];

export type PerfContext = {
  route: string;
  requestId: string;
};

const PERF_ROUTES = new Set(["/auth/me", "/me/dashboard"]);
const perfStore = new AsyncLocalStorage<PerfContext>();

export function isPerfLoggingEnabled(): boolean {
  return parsePerfLogging(process.env.PERF_LOGGING);
}

export function isInstrumentedPerfRoute(path: string): boolean {
  return PERF_ROUTES.has(path);
}

export function createPerfRequestId(): string {
  return `req_${randomBytes(8).toString("hex")}`;
}

export function formatPerfLog(input: {
  route: string;
  operation: string;
  ms: number;
  requestId: string;
}): string {
  return `${PERF_LOG_PREFIX} route=${input.route} op=${input.operation} ms=${Math.round(input.ms)} requestId=${input.requestId}`;
}

export function getPerfContext(): PerfContext | undefined {
  return perfStore.getStore();
}

export function runWithPerfContext<T>(context: PerfContext, fn: () => T): T {
  return perfStore.run(context, fn);
}

export function logPerf(operation: string, ms: number, context = getPerfContext()): void {
  if (!isPerfLoggingEnabled() || !context) {
    return;
  }

  console.info(
    formatPerfLog({
      route: context.route,
      operation,
      ms,
      requestId: context.requestId,
    }),
  );
}

export async function timePerf<T>(operation: PerfOperation, work: () => Promise<T>): Promise<T> {
  if (!isPerfLoggingEnabled() || !getPerfContext()) {
    return work();
  }

  const startedAt = performance.now();

  try {
    return await work();
  } finally {
    logPerf(operation, performance.now() - startedAt);
  }
}

export function wrapTimedMiddleware(operation: PerfOperation, middleware: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = getPerfContext();
    if (!isPerfLoggingEnabled() || !context) {
      middleware(req, res, next);
      return;
    }

    const startedAt = performance.now();
    middleware(req, res, ((error?: unknown) => {
      logPerf(operation, performance.now() - startedAt, context);
      if (error !== undefined) {
        next(error);
        return;
      }

      next();
    }) as NextFunction);
  };
}

export function instrumentSessionStore(store: Store): void {
  const originalGet = store.get.bind(store);

  store.get = (sid: string, callback: (error: Error | null, session?: SessionData | null) => void) => {
    const context = getPerfContext();
    if (!isPerfLoggingEnabled() || !context) {
      originalGet(sid, callback);
      return;
    }

    const startedAt = performance.now();
    originalGet(sid, (error, session) => {
      logPerf(PERF_OP.sessionStoreGet, performance.now() - startedAt, context);
      callback(error, session);
    });
  };
}

type PoolConnectCallback = (err: Error, client: PoolClient, done: (release?: unknown) => void) => void;

export function instrumentPoolConnect(pool: Pool): void {
  const originalConnect = pool.connect.bind(pool) as {
    (): Promise<PoolClient>;
    (callback: PoolConnectCallback): void;
  };

  pool.connect = ((callback?: PoolConnectCallback) => {
    const context = getPerfContext();
    if (!isPerfLoggingEnabled() || !context) {
      return callback ? originalConnect(callback) : originalConnect();
    }

    const startedAt = performance.now();
    const doneTiming = () => {
      logPerf(PERF_OP.poolAcquire, performance.now() - startedAt, context);
    };

    if (callback) {
      return originalConnect((err, client, done) => {
        doneTiming();
        callback(err, client, done);
      });
    }

    return originalConnect().then(
      (client) => {
        doneTiming();
        return client;
      },
      (error: unknown) => {
        doneTiming();
        throw error;
      },
    );
  }) as Pool["connect"];
}
