export const DEV_PLACEHOLDER_SESSION_SECRET = "dev-session-secret-central-academica-fiap";
export const DEV_PLACEHOLDER_DATABASE_USER = "central";
export const DEV_PLACEHOLDER_DATABASE_PASSWORD = "central";

export function usesDocumentedDevelopmentDatabaseCredentials(databaseUrl: string): boolean {
  try {
    const parsed = new URL(databaseUrl);
    return (
      decodeURIComponent(parsed.username) === DEV_PLACEHOLDER_DATABASE_USER &&
      decodeURIComponent(parsed.password) === DEV_PLACEHOLDER_DATABASE_PASSWORD
    );
  } catch {
    return false;
  }
}

export function assertProductionConfiguration(input: {
  nodeEnv: string;
  sessionSecret: string;
  databaseUrl: string;
}): void {
  if (input.nodeEnv !== "production") {
    return;
  }

  if (input.sessionSecret === DEV_PLACEHOLDER_SESSION_SECRET) {
    throw new Error(
      "Refusing to start: SESSION_SECRET must not reuse the documented development placeholder when NODE_ENV=production.",
    );
  }

  if (usesDocumentedDevelopmentDatabaseCredentials(input.databaseUrl)) {
    throw new Error(
      "Refusing to start: DATABASE_URL must not reuse the documented development database credentials when NODE_ENV=production.",
    );
  }
}
