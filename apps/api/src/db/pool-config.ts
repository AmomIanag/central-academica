import type { PoolConfig } from "pg";

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
    ...(ssl ? { ssl } : {}),
  };
}
