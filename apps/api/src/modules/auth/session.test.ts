import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE_MAX_AGE_MS,
  SESSION_COOKIE_NAME,
  SESSION_DISABLE_TOUCH,
  SESSION_TTL_SECONDS,
  buildSessionCookieOptions,
  sessionCookieOptions,
  sessionStore,
} from "./session";

describe("session cookie and store configuration", () => {
  it("keeps HttpOnly, SameSite=Lax, path=/, 24h Max-Age, and Secure only in production", () => {
    expect(SESSION_COOKIE_MAX_AGE_MS).toBe(86400000);
    expect(buildSessionCookieOptions("production")).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    });
    expect(buildSessionCookieOptions("test")).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    });
    expect(sessionCookieOptions).toEqual(buildSessionCookieOptions("test"));
    expect(sessionCookieOptions).not.toHaveProperty("domain");
    expect(sessionCookieOptions).not.toHaveProperty("expires");
    expect(SESSION_COOKIE_NAME).toBe("central.sid");
  });

  it("uses an explicit 24h absolute store TTL and disables sliding touch renewal", () => {
    expect(SESSION_TTL_SECONDS).toBe(60 * 60 * 24);
    expect(SESSION_DISABLE_TOUCH).toBe(true);
    expect(sessionStore.ttl).toBe(SESSION_TTL_SECONDS);
  });
});
