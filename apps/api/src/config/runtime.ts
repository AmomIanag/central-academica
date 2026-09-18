const DEFAULT_DEV_PORT = 3001;
const DEFAULT_PRODUCTION_HOST = "0.0.0.0";
const TRUST_PROXY_HOPS_MAX = 32;

export function parseListenPort(raw: string | undefined, nodeEnv: string): number {
  if (raw === undefined || raw.trim() === "") {
    if (nodeEnv === "production") {
      throw new Error("PORT is required when NODE_ENV=production.");
    }

    return DEFAULT_DEV_PORT;
  }

  if (!/^\d+$/.test(raw.trim())) {
    throw new Error("PORT must be a positive integer");
  }

  const port = Number(raw.trim());

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return port;
}

export function parseListenHost(raw: string | undefined, nodeEnv: string): string | undefined {
  const host = raw?.trim();

  if (host) {
    return host;
  }

  return nodeEnv === "production" ? DEFAULT_PRODUCTION_HOST : undefined;
}

export function parseTrustProxyHops(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    return 0;
  }

  const value = raw.trim();

  if (!/^\d+$/.test(value)) {
    throw new Error("TRUST_PROXY_HOPS must be a non-negative integer.");
  }

  const hops = Number(value);

  if (!Number.isInteger(hops) || hops < 0 || hops > TRUST_PROXY_HOPS_MAX) {
    throw new Error(`TRUST_PROXY_HOPS must be an integer between 0 and ${TRUST_PROXY_HOPS_MAX}.`);
  }

  return hops;
}
