import type { Response } from "express";

export function sendData<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const error: { code: string; message: string; details?: unknown } = {
    code,
    message,
  };

  if (details !== undefined) {
    error.details = details;
  }

  res.status(status).json({ error });
}
