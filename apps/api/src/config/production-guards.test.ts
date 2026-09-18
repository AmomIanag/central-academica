import { describe, expect, it } from "vitest";
import {
  DEV_PLACEHOLDER_CORS_ORIGIN,
  DEV_PLACEHOLDER_SESSION_SECRET,
  assertDevelopmentSeedAllowed,
  assertProductionConfiguration,
} from "./production-guards";

const PRODUCTION_DATABASE_URL = "postgresql://central_prod:unique-prod-db-secret@db.internal:5432/central_academica";
const PRODUCTION_SESSION_SECRET = "unique-production-session-secret-value";
const PRODUCTION_CORS_ORIGIN = "https://frontend.example";
const DEVELOPMENT_DATABASE_URL = "postgresql://central:central@localhost:5433/central_academica";

describe("production configuration guards", () => {
  it("allows documented development placeholders outside production", () => {
    expect(() =>
      assertProductionConfiguration({
        nodeEnv: "development",
        sessionSecret: DEV_PLACEHOLDER_SESSION_SECRET,
        databaseUrl: DEVELOPMENT_DATABASE_URL,
        corsOrigin: DEV_PLACEHOLDER_CORS_ORIGIN,
      }),
    ).not.toThrow();
  });

  it("allows unique production secrets", () => {
    expect(() =>
      assertProductionConfiguration({
        nodeEnv: "production",
        sessionSecret: PRODUCTION_SESSION_SECRET,
        databaseUrl: PRODUCTION_DATABASE_URL,
        corsOrigin: PRODUCTION_CORS_ORIGIN,
      }),
    ).not.toThrow();
  });

  it("rejects the documented development SESSION_SECRET in production", () => {
    expect(() =>
      assertProductionConfiguration({
        nodeEnv: "production",
        sessionSecret: DEV_PLACEHOLDER_SESSION_SECRET,
        databaseUrl: PRODUCTION_DATABASE_URL,
        corsOrigin: PRODUCTION_CORS_ORIGIN,
      }),
    ).toThrow(/SESSION_SECRET must not reuse the documented development placeholder/);
  });

  it("rejects the documented development database credentials in production", () => {
    expect(() =>
      assertProductionConfiguration({
        nodeEnv: "production",
        sessionSecret: PRODUCTION_SESSION_SECRET,
        databaseUrl: DEVELOPMENT_DATABASE_URL,
        corsOrigin: PRODUCTION_CORS_ORIGIN,
      }),
    ).toThrow(/DATABASE_URL must not reuse the documented development database credentials/);
  });

  it("rejects the documented development CORS origin in production", () => {
    expect(() =>
      assertProductionConfiguration({
        nodeEnv: "production",
        sessionSecret: PRODUCTION_SESSION_SECRET,
        databaseUrl: PRODUCTION_DATABASE_URL,
        corsOrigin: DEV_PLACEHOLDER_CORS_ORIGIN,
      }),
    ).toThrow(/CORS_ORIGIN must not reuse the documented development origin/);
  });
});

describe("development seed guard", () => {
  it("allows the development seed outside production", () => {
    expect(() => assertDevelopmentSeedAllowed("development")).not.toThrow();
    expect(() => assertDevelopmentSeedAllowed("test")).not.toThrow();
  });

  it("forbids the development seed in production", () => {
    expect(() => assertDevelopmentSeedAllowed("production")).toThrow(
      /development seed is forbidden when NODE_ENV=production/,
    );
  });
});
