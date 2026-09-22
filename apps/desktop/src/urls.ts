export function tryParseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function isTrustedNavigationUrl(
  raw: string,
  trustedOrigin: string,
): boolean {
  const parsed = tryParseUrl(raw);

  if (!parsed) {
    return false;
  }

  return parsed.origin === trustedOrigin;
}

export function isSafeExternalUrl(raw: string): boolean {
  const parsed = tryParseUrl(raw);

  if (!parsed) {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }

  if (parsed.username || parsed.password) {
    return false;
  }

  return parsed.hostname.length > 0;
}
