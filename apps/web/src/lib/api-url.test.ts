import { describe, expect, it } from "vitest";
import { isRelativeApiBase, joinApiUrl } from "./api-url";

describe("joinApiUrl", () => {
  it("joins a development absolute base without dropping the host", () => {
    expect(joinApiUrl("http://localhost:3001", "/auth/login")).toBe(
      "http://localhost:3001/auth/login",
    );
  });

  it("joins a production relative /api base without duplicating slashes", () => {
    expect(joinApiUrl("/api", "/auth/login")).toBe("/api/auth/login");
    expect(joinApiUrl("/api/", "/auth/login")).toBe("/api/auth/login");
    expect(joinApiUrl("/api", "auth/login")).toBe("/api/auth/login");
  });

  it("does not collapse /api away", () => {
    expect(joinApiUrl("/api", "/me/dashboard")).toBe("/api/me/dashboard");
    expect(joinApiUrl("http://localhost:3001/", "/me/tasks")).toBe("http://localhost:3001/me/tasks");
  });
});

describe("isRelativeApiBase", () => {
  it("detects the production /api base", () => {
    expect(isRelativeApiBase("/api")).toBe(true);
    expect(isRelativeApiBase("/api/")).toBe(true);
    expect(isRelativeApiBase("http://localhost:3001")).toBe(false);
    expect(isRelativeApiBase(undefined)).toBe(false);
  });
});
