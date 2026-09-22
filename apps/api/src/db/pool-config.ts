import type { PoolConfig } from "pg";

export const POSTGRES_POOL_MAX = 10;
export const POSTGRES_POOL_MIN = 3;
export const POSTGRES_POOL_IDLE_TIMEOUT_MS = 60_000;
export const POSTGRES_POOL_CONNECTION_TIMEOUT_MS = 10_000;
export const POSTGRES_POOL_KEEPALIVE_INITIAL_DELAY_MS = 10_000;

export type PostgresSslConfig = {
  rejectUnauthorized: true;
  ca?: string;
};

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

export function normalizeDatabaseSslCa(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }

  let value = raw.trim();

  if (!value) {
    return undefined;
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  if (!value) {
    return undefined;
  }

  return value.replace(/\r\n/g, "\n").replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
}

export function resolvePostgresSsl(
  connectionString: string,
  nodeEnv: string,
  sslCa?: string,
): PostgresSslConfig | undefined {
  const mode = sslMode(connectionString);

  if (mode === "disable") {
    return undefined;
  }

  const enableTls =
    mode === "require" ||
    mode === "verify-ca" ||
    mode === "verify-full" ||
    (nodeEnv === "production" && !isLoopbackHost(connectionString));

  if (!enableTls) {
    return undefined;
  }

  const ca = normalizeDatabaseSslCa(sslCa);
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}

export function postgresPoolConfig(
  connectionString: string,
  nodeEnv: string,
  sslCa?: string,
): PoolConfig {
  const ssl = resolvePostgresSsl(connectionString, nodeEnv, sslCa);

  return {
    connectionString: stripSslSearchParams(connectionString),
    max: POSTGRES_POOL_MAX,
    min: nodeEnv === "test" ? 0 : POSTGRES_POOL_MIN,
    idleTimeoutMillis: POSTGRES_POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: POSTGRES_POOL_CONNECTION_TIMEOUT_MS,
    keepAlive: true,
    keepAliveInitialDelayMillis: POSTGRES_POOL_KEEPALIVE_INITIAL_DELAY_MS,
    ...(ssl ? { ssl } : {}),
  };
}
