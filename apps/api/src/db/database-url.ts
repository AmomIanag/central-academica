export type ParsedDatabaseUrl = {
  host: string;
  port: string;
  database: string;
  masked: string;
};

export function maskDatabaseUrl(url: string): string {
  return url.replace(/:([^:@]+)@/, ":****@");
}

export function parseDatabaseUrl(url: string): ParsedDatabaseUrl {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid database URL: ${maskDatabaseUrl(url)}`);
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "")).split("/")[0] ?? "";

  return {
    host: parsed.hostname,
    port: parsed.port,
    database,
    masked: maskDatabaseUrl(url),
  };
}

export function isProjectPostgresHost(url: string): boolean {
  const parsed = parseDatabaseUrl(url);
  const hostOk = parsed.host === "localhost" || parsed.host === "127.0.0.1";
  return hostOk && parsed.port === "5433";
}

export const DEV_DATABASE_NAME = "central_academica";
export const TEST_DATABASE_NAME = "central_academica_test";
export const ALLOWED_PROJECT_DATABASES = new Set([DEV_DATABASE_NAME, TEST_DATABASE_NAME]);
