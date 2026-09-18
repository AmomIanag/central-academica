import dotenv from "dotenv";
import path from "node:path";
import { assertProductionConfiguration } from "./production-guards";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const SESSION_SECRET_MIN_LENGTH = 32;

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const port = Number(process.env.PORT ?? "3001");

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a positive integer");
}

const sessionSecret = required("SESSION_SECRET");

if (sessionSecret.length < SESSION_SECRET_MIN_LENGTH) {
  throw new Error(`SESSION_SECRET must be at least ${SESSION_SECRET_MIN_LENGTH} characters`);
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const databaseUrl = required("DATABASE_URL");
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

assertProductionConfiguration({
  nodeEnv,
  sessionSecret,
  databaseUrl,
});

export const env = {
  nodeEnv,
  port,
  databaseUrl,
  testDatabaseUrl,
  corsOrigin: required("CORS_ORIGIN"),
  sessionSecret,
};

export function runtimeDatabaseUrl(): string {
  if (nodeEnv === "test") {
    if (!testDatabaseUrl) {
      throw new Error("Missing required environment variable: TEST_DATABASE_URL");
    }

    return testDatabaseUrl;
  }

  return databaseUrl;
}
