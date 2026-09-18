import { env, runtimeDatabaseUrl } from "../config/env";
import {
  TEST_DATABASE_NAME,
  maskDatabaseUrl,
  parseDatabaseUrl,
  isProjectPostgresHost,
} from "./database-url";

export function assertTestDatabaseUrl(url: string, label = "TEST_DATABASE_URL"): void {
  if (!isProjectPostgresHost(url)) {
    throw new Error(
      `Refusing to run: ${label} must target the project PostgreSQL at localhost:5433. Received: ${maskDatabaseUrl(url)}`,
    );
  }

  const parsed = parseDatabaseUrl(url);

  if (parsed.database !== TEST_DATABASE_NAME) {
    throw new Error(
      `Refusing to run: ${label} must use database "${TEST_DATABASE_NAME}", not "${parsed.database}". Received: ${parsed.masked}`,
    );
  }
}

export function assertTestDatabase(): void {
  const url = runtimeDatabaseUrl();
  assertTestDatabaseUrl(url, "runtime database URL");

  if (url === env.databaseUrl) {
    throw new Error(
      "Refusing to run: test runtime URL must not be the same as DATABASE_URL (development).",
    );
  }

  const runtime = parseDatabaseUrl(url);
  const development = parseDatabaseUrl(env.databaseUrl);

  if (runtime.database === development.database) {
    throw new Error(
      `Refusing to run: test database "${runtime.database}" must be distinct from development database "${development.database}".`,
    );
  }
}
