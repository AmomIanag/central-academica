import type { Request, Response } from "express";
import { MemoryStore, rateLimit } from "express-rate-limit";
import { sendError } from "../../http/response";

export const LOGIN_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  ipLimit: 20,
  accountLimit: 10,
} as const;

const RATE_LIMITED_MESSAGE = "Muitas tentativas de login. Tente novamente em instantes.";

const ipStore = new MemoryStore();
const accountStore = new MemoryStore();

export function normalizeLoginEmail(email: unknown): string | null {
  if (typeof email !== "string") {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function sendRateLimited(_req: Request, res: Response): void {
  sendError(res, 429, "TOO_MANY_REQUESTS", RATE_LIMITED_MESSAGE);
}

export const loginIpRateLimiter = rateLimit({
  windowMs: LOGIN_RATE_LIMIT.windowMs,
  limit: LOGIN_RATE_LIMIT.ipLimit,
  standardHeaders: false,
  legacyHeaders: false,
  store: ipStore,
  handler: sendRateLimited,
  validate: {
    xForwardedForHeader: false,
  },
});

export const loginAccountRateLimiter = rateLimit({
  windowMs: LOGIN_RATE_LIMIT.windowMs,
  limit: LOGIN_RATE_LIMIT.accountLimit,
  standardHeaders: false,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: accountStore,
  handler: sendRateLimited,
  skip: (req) => normalizeLoginEmail(req.body?.email) === null,
  keyGenerator: (req) => `account:${normalizeLoginEmail(req.body?.email) ?? "unspecified"}`,
  validate: {
    xForwardedForHeader: false,
    keyGeneratorIpFallback: false,
  },
});

export async function resetLoginRateLimiters(): Promise<void> {
  await ipStore.resetAll();
  await accountStore.resetAll();
}
