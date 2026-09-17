import { env } from "../config/env";

const PROJECT_DB_HOST_PORT = /(?:localhost|127\.0\.0\.1):5433\b/;

function maskDatabaseUrl(url: string): string {
  return url.replace(/:([^:@]+)@/, ":****@");
}

export function assertProjectDatabase(): void {
  if (!PROJECT_DB_HOST_PORT.test(env.databaseUrl)) {
    throw new Error(
      `Refusing to run: DATABASE_URL must target the project PostgreSQL at localhost:5433. Received: ${maskDatabaseUrl(env.databaseUrl)}`,
    );
  }
}
