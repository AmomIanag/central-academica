import { describe, expect, it } from "vitest";
import { TEST_DATABASE_NAME } from "./database-url";
import {
  assertV22ReshapeSafety,
  describeMigrationTarget,
  resolveProductionMigrationUrl,
} from "./production-migrate";

const PRODUCTION_MIGRATION_URL =
  "postgresql://central_prod:unique-prod-db-secret@db.internal:5432/central_academica";
const LOCAL_DEV_URL = "postgresql://central:central@localhost:5433/central_academica";
const LOCAL_TEST_URL = `postgresql://central:central@localhost:5433/${TEST_DATABASE_NAME}`;

describe("resolveProductionMigrationUrl", () => {
  it("requires an explicit acknowledgement and migration URL", () => {
    expect(() => resolveProductionMigrationUrl({})).toThrow(/ALLOW_PRODUCTION_MIGRATIONS/);
    expect(() =>
      resolveProductionMigrationUrl({
        ALLOW_PRODUCTION_MIGRATIONS: "true",
      }),
    ).toThrow(/MIGRATION_DATABASE_URL is required/);
    expect(() =>
      resolveProductionMigrationUrl({
        ALLOW_PRODUCTION_MIGRATIONS: "yes",
        MIGRATION_DATABASE_URL: PRODUCTION_MIGRATION_URL,
      }),
    ).toThrow(/ALLOW_PRODUCTION_MIGRATIONS/);
  });

  it("accepts an explicit hosted migration URL", () => {
    expect(
      resolveProductionMigrationUrl({
        ALLOW_PRODUCTION_MIGRATIONS: "true",
        MIGRATION_DATABASE_URL: PRODUCTION_MIGRATION_URL,
        DATABASE_URL: LOCAL_DEV_URL,
        TEST_DATABASE_URL: LOCAL_TEST_URL,
      }),
    ).toBe(PRODUCTION_MIGRATION_URL);
  });

  it("never falls back to DATABASE_URL or TEST_DATABASE_URL", () => {
    expect(() =>
      resolveProductionMigrationUrl({
        ALLOW_PRODUCTION_MIGRATIONS: "true",
        DATABASE_URL: PRODUCTION_MIGRATION_URL,
        TEST_DATABASE_URL: LOCAL_TEST_URL,
      }),
    ).toThrow(/MIGRATION_DATABASE_URL is required/);

    expect(() =>
      resolveProductionMigrationUrl({
        ALLOW_PRODUCTION_MIGRATIONS: "true",
        MIGRATION_DATABASE_URL: LOCAL_TEST_URL,
        TEST_DATABASE_URL: LOCAL_TEST_URL,
      }),
    ).toThrow(/must not be TEST_DATABASE_URL/);
  });

  it("rejects the local development PostgreSQL and documented credentials", () => {
    expect(() =>
      resolveProductionMigrationUrl({
        ALLOW_PRODUCTION_MIGRATIONS: "true",
        MIGRATION_DATABASE_URL: LOCAL_DEV_URL,
      }),
    ).toThrow(/localhost:5433/);

    expect(() =>
      resolveProductionMigrationUrl({
        ALLOW_PRODUCTION_MIGRATIONS: "true",
        MIGRATION_DATABASE_URL: "postgresql://central:central@db.internal:5432/central_academica",
      }),
    ).toThrow(/documented development database credentials/);
  });

  it("describes the target without credentials", () => {
    const description = describeMigrationTarget(PRODUCTION_MIGRATION_URL);
    expect(description).toContain("host=db.internal");
    expect(description).toContain("database=central_academica");
    expect(description).toContain("****");
    expect(description).not.toContain("unique-prod-db-secret");
  });
});

describe("assertV22ReshapeSafety", () => {
  it("allows an empty database where academic-v22 has not run yet", () => {
    expect(() =>
      assertV22ReshapeSafety({
        v22Applied: false,
        usersCount: 0,
        gradesCount: 0,
        assessmentsCount: 0,
        disciplinesCount: 0,
      }),
    ).not.toThrow();
  });

  it("allows a populated database after academic-v22 is already applied", () => {
    expect(() =>
      assertV22ReshapeSafety({
        v22Applied: true,
        usersCount: 4,
        gradesCount: 20,
        assessmentsCount: 16,
        disciplinesCount: 5,
      }),
    ).not.toThrow();
  });

  it("refuses to reshape a populated database that has not applied academic-v22", () => {
    expect(() =>
      assertV22ReshapeSafety({
        v22Applied: false,
        usersCount: 1,
        gradesCount: 8,
        assessmentsCount: 5,
        disciplinesCount: 5,
      }),
    ).toThrow(/V2.2 reshape/);
  });
});
