import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { sendError } from "../http/response";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;

  if (origin !== env.corsOrigin) {
    sendError(res, 403, "CSRF_REJECTED", "Request origin is not allowed.");
    return;
  }

  next();
}
