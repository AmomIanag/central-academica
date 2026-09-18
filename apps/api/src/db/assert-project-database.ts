import { env } from "../config/env";
import {
  ALLOWED_PROJECT_DATABASES,
  isProjectPostgresHost,
  maskDatabaseUrl,
  parseDatabaseUrl,
} from "./database-url";

export function assertProjectDatabase(url = env.databaseUrl): void {
  if (!isProjectPostgresHost(url)) {
    throw new Error(
      `Refusing to run: DATABASE_URL must target the project PostgreSQL at localhost:5433. Received: ${maskDatabaseUrl(url)}`,
    );
  }

  const parsed = parseDatabaseUrl(url);

  if (!ALLOWED_PROJECT_DATABASES.has(parsed.database)) {
    throw new Error(
      `Refusing to run: database must be one of ${[...ALLOWED_PROJECT_DATABASES].join(", ")}. Received: ${parsed.masked}`,
    );
  }
}
