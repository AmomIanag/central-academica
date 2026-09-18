import type { PoolConfig } from "pg";

export type PostgresSslConfig = { rejectUnauthorized: true };

function parseConnectionUrl(connectionString: string): URL {
  try {
    return new URL(connectionString);
  } catch {
    throw new Error("Invalid database URL.");
  }
}

function sslMode(connectionString: string): string | null {
  return parseConnectionUrl(connectionString).searchParams.get("sslmode")?.toLowerCase() ?? null;
}

function isLoopbackHost(connectionString: string): boolean {
  const host = parseConnectionUrl(connectionString).hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function stripSslSearchParams(connectionString: string): string {
  const parsed = parseConnectionUrl(connectionString);
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("ssl");
  return parsed.toString();
}

export function resolvePostgresSsl(
  connectionString: string,
  nodeEnv: string,
): PostgresSslConfig | undefined {
  const mode = sslMode(connectionString);

  if (mode === "disable") {
    return undefined;
  }

  if (mode === "require" || mode === "verify-ca" || mode === "verify-full") {
    return { rejectUnauthorized: true };
  }

  if (nodeEnv === "production" && !isLoopbackHost(connectionString)) {
    return { rejectUnauthorized: true };
  }

  return undefined;
}

export function postgresPoolConfig(connectionString: string, nodeEnv: string): PoolConfig {
  const ssl = resolvePostgresSsl(connectionString, nodeEnv);

  return {
    connectionString: stripSslSearchParams(connectionString),
    ...(ssl ? { ssl } : {}),
  };
}
