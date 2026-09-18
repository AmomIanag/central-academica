import { isRelativeApiBase } from "./api-url";

export type Rewrite = {
  source: string;
  destination: string;
};

export function parseApiProxyTarget(raw: string | undefined): string | null {
  const value = raw?.trim();

  if (!value) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("API_PROXY_TARGET must be an absolute http(s) origin.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("API_PROXY_TARGET must be an absolute http(s) origin.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("API_PROXY_TARGET must not include credentials.");
  }

  const pathname = parsed.pathname.replace(/\/+$/, "");

  if (pathname !== "") {
    throw new Error("API_PROXY_TARGET must be an origin without a path.");
  }

  return parsed.origin;
}

export function createApiProxyRewrites(env: NodeJS.Dict<string>): Rewrite[] {
  const target = parseApiProxyTarget(env.API_PROXY_TARGET);

  if (isRelativeApiBase(env.NEXT_PUBLIC_API_URL) && !target) {
    throw new Error(
      "API_PROXY_TARGET is required when NEXT_PUBLIC_API_URL uses the relative /api base.",
    );
  }

  if (!target) {
    return [];
  }

  return [
    {
      source: "/api/:path*",
      destination: `${target}/:path*`,
    },
  ];
}
