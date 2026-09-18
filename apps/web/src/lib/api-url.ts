export function joinApiUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function isRelativeApiBase(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return value.replace(/\/+$/, "") === "/api";
}
