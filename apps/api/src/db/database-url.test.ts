import { describe, expect, it } from "vitest";
import { env } from "../config/env";
import { assertTestDatabase, assertTestDatabaseUrl } from "./assert-test-database";
import {
  DEV_DATABASE_NAME,
  TEST_DATABASE_NAME,
  isProjectPostgresHost,
  parseDatabaseUrl,
} from "./database-url";

describe("project database URLs", () => {
  it("accepts the local Docker development database on localhost:5433", () => {
    expect(isProjectPostgresHost(env.databaseUrl)).toBe(true);
    expect(parseDatabaseUrl(env.databaseUrl).database).toBe(DEV_DATABASE_NAME);
    expect(parseDatabaseUrl(env.databaseUrl).port).toBe("5433");
  });

  it("keeps the test database distinct and fail-closed", () => {
    expect(env.testDatabaseUrl).toBeDefined();
    expect(isProjectPostgresHost(env.testDatabaseUrl ?? "")).toBe(true);
    expect(parseDatabaseUrl(env.testDatabaseUrl ?? "").database).toBe(TEST_DATABASE_NAME);
    expect(env.testDatabaseUrl).not.toBe(env.databaseUrl);

    expect(() => assertTestDatabase()).not.toThrow();
    expect(() => assertTestDatabaseUrl(env.databaseUrl)).toThrow(/must use database/);
  });
});
