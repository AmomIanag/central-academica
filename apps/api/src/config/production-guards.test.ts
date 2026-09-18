import { describe, expect, it } from "vitest";
import {
  DEV_PLACEHOLDER_SESSION_SECRET,
  assertProductionConfiguration,
} from "./production-guards";

const PRODUCTION_DATABASE_URL = "postgresql://central_prod:unique-prod-db-secret@db.internal:5432/central_academica";
const PRODUCTION_SESSION_SECRET = "unique-production-session-secret-value";
const DEVELOPMENT_DATABASE_URL = "postgresql://central:central@localhost:5433/central_academica";

describe("production configuration guards", () => {
  it("allows documented development placeholders outside production", () => {
    expect(() =>
      assertProductionConfiguration({
        nodeEnv: "development",
        sessionSecret: DEV_PLACEHOLDER_SESSION_SECRET,
        databaseUrl: DEVELOPMENT_DATABASE_URL,
      }),
    ).not.toThrow();
  });

  it("allows unique production secrets", () => {
    expect(() =>
      assertProductionConfiguration({
        nodeEnv: "production",
        sessionSecret: PRODUCTION_SESSION_SECRET,
        databaseUrl: PRODUCTION_DATABASE_URL,
      }),
    ).not.toThrow();
  });

  it("rejects the documented development SESSION_SECRET in production", () => {
    expect(() =>
      assertProductionConfiguration({
        nodeEnv: "production",
        sessionSecret: DEV_PLACEHOLDER_SESSION_SECRET,
        databaseUrl: PRODUCTION_DATABASE_URL,
      }),
    ).toThrow(/SESSION_SECRET must not reuse the documented development placeholder/);
  });

  it("rejects the documented development database credentials in production", () => {
    expect(() =>
      assertProductionConfiguration({
        nodeEnv: "production",
        sessionSecret: PRODUCTION_SESSION_SECRET,
        databaseUrl: DEVELOPMENT_DATABASE_URL,
      }),
    ).toThrow(/DATABASE_URL must not reuse the documented development database credentials/);
  });
});
