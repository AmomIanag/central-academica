import type { NextFunction, Request, Response } from "express";
import {
  createPerfRequestId,
  isInstrumentedPerfRoute,
  isPerfLoggingEnabled,
  logPerf,
  PERF_OP,
  runWithPerfContext,
} from "../lib/perf";

export function perfRequestContext(req: Request, res: Response, next: NextFunction): void {
  if (!isPerfLoggingEnabled() || !isInstrumentedPerfRoute(req.path)) {
    next();
    return;
  }

  const context = {
    route: req.path,
    requestId: createPerfRequestId(),
  };
  const startedAt = performance.now();

  runWithPerfContext(context, () => {
    res.once("finish", () => {
      logPerf(PERF_OP.requestTotal, performance.now() - startedAt, context);
    });
    next();
  });
}
