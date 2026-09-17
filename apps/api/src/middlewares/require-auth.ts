import type { NextFunction, Request, Response } from "express";
import { sendError } from "../http/response";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    sendError(res, 401, "UNAUTHENTICATED", "Authentication required.");
    return;
  }

  next();
}
