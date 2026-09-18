import dotenv from "dotenv";
import path from "node:path";
import { assertProductionConfiguration } from "./production-guards";
import { parseListenHost, parseListenPort, parseTrustProxyHops } from "./runtime";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const SESSION_SECRET_MIN_LENGTH = 32;

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const port = parseListenPort(process.env.PORT, nodeEnv);
const host = parseListenHost(process.env.HOST, nodeEnv);
const trustProxyHops = parseTrustProxyHops(process.env.TRUST_PROXY_HOPS);
const sessionSecret = required("SESSION_SECRET");

if (sessionSecret.length < SESSION_SECRET_MIN_LENGTH) {
  throw new Error(`SESSION_SECRET must be at least ${SESSION_SECRET_MIN_LENGTH} characters`);
}

const databaseUrl = required("DATABASE_URL");
const corsOrigin = required("CORS_ORIGIN");
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

assertProductionConfiguration({
  nodeEnv,
  sessionSecret,
  databaseUrl,
  corsOrigin,
});

export const env = {
  nodeEnv,
  port,
  host,
  databaseUrl,
  testDatabaseUrl,
  corsOrigin,
  sessionSecret,
  trustProxyHops,
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
