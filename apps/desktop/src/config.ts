export const PRODUCT_NAME = "Central Acadêmica";
export const APP_ID = "br.fiap.central-academica";
export const DEFAULT_APP_URL = "https://central-academica-web-one.vercel.app";
export const WINDOW_BACKGROUND = "#0b0b0c";

const INVALID_URL_MESSAGE =
  "A URL da aplicação é inválida. Use apenas http ou https.";

export function parseHttpUrl(raw: string): URL {
  const value = raw.trim();

  if (!value) {
    throw new Error(INVALID_URL_MESSAGE);
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(INVALID_URL_MESSAGE);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(INVALID_URL_MESSAGE);
  }

  if (parsed.username || parsed.password) {
    throw new Error("A URL da aplicação não pode incluir credenciais.");
  }

  return parsed;
}

export function resolveAppUrl(env: NodeJS.Dict<string> = process.env): URL {
  const override = env.DESKTOP_APP_URL;

  if (override === undefined || override.trim() === "") {
    return parseHttpUrl(DEFAULT_APP_URL);
  }

  return parseHttpUrl(override);
}

export function getTrustedOrigin(appUrl: URL): string {
  return appUrl.origin;
}
