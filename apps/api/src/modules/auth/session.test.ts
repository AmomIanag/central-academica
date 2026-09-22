import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE_NAME,
  SESSION_DISABLE_TOUCH,
  SESSION_TTL_SECONDS,
  buildSessionCookieOptions,
  sessionCookieOptions,
  sessionStore,
} from "./session";

describe("session cookie and store configuration", () => {
  it("keeps HttpOnly, SameSite=Lax, path=/, and Secure only in production", () => {
    expect(buildSessionCookieOptions("production")).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
    expect(buildSessionCookieOptions("test")).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
    });
    expect(sessionCookieOptions).toEqual(buildSessionCookieOptions("test"));
    expect(sessionCookieOptions).not.toHaveProperty("maxAge");
    expect(sessionCookieOptions).not.toHaveProperty("expires");
    expect(SESSION_COOKIE_NAME).toBe("central.sid");
  });

  it("uses an explicit 24h absolute store TTL and disables sliding touch renewal", () => {
    expect(SESSION_TTL_SECONDS).toBe(60 * 60 * 24);
    expect(SESSION_DISABLE_TOUCH).toBe(true);
    expect(sessionStore.ttl).toBe(SESSION_TTL_SECONDS);
  });
});
