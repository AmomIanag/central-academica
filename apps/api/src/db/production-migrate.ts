import {
  usesDocumentedDevelopmentDatabaseCredentials,
} from "../config/production-guards";
import {
  TEST_DATABASE_NAME,
  isProjectPostgresHost,
  parseDatabaseUrl,
} from "./database-url";

export const ACADEMIC_V22_MIGRATION_NAME = "academic-v22";

export function resolveProductionMigrationUrl(env: NodeJS.Dict<string>): string {
  if (env.ALLOW_PRODUCTION_MIGRATIONS !== "true") {
    throw new Error(
      'Refusing to run production migrations: ALLOW_PRODUCTION_MIGRATIONS must be exactly "true".',
    );
  }

  const url = env.MIGRATION_DATABASE_URL?.trim();

  if (!url) {
    throw new Error("Refusing to run production migrations: MIGRATION_DATABASE_URL is required.");
  }

  const testDatabaseUrl = env.TEST_DATABASE_URL?.trim();

  if (testDatabaseUrl && url === testDatabaseUrl) {
    throw new Error(
      "Refusing to run production migrations: MIGRATION_DATABASE_URL must not be TEST_DATABASE_URL.",
    );
  }

  const parsed = parseDatabaseUrl(url);

  if (parsed.database === TEST_DATABASE_NAME) {
    throw new Error(
      `Refusing to run production migrations: target database must not be "${TEST_DATABASE_NAME}".`,
    );
  }

  if (isProjectPostgresHost(url)) {
    throw new Error(
      "Refusing to run production migrations: MIGRATION_DATABASE_URL must not target the local development PostgreSQL at localhost:5433.",
    );
  }

  if (usesDocumentedDevelopmentDatabaseCredentials(url)) {
    throw new Error(
      "Refusing to run production migrations: MIGRATION_DATABASE_URL must not reuse the documented development database credentials.",
    );
  }

  return url;
}

export function describeMigrationTarget(url: string): string {
  const parsed = parseDatabaseUrl(url);
  const port = parsed.port || "default";
  return `host=${parsed.host} port=${port} database=${parsed.database} url=${parsed.masked}`;
}

export type MigrationSafetySnapshot = {
  v22Applied: boolean;
  usersCount: number;
  gradesCount: number;
  assessmentsCount: number;
  disciplinesCount: number;
};

export function assertV22ReshapeSafety(snapshot: MigrationSafetySnapshot): void {
  if (snapshot.v22Applied) {
    return;
  }

  const hasData =
    snapshot.usersCount > 0 ||
    snapshot.gradesCount > 0 ||
    snapshot.assessmentsCount > 0 ||
    snapshot.disciplinesCount > 0;

  if (hasData) {
    throw new Error(
      "Refusing to run production migrations: V2.2 reshape deletes assessments/grades and is only safe on an empty database or one where academic-v22 is already applied. Start production from an empty PostgreSQL database.",
    );
  }
}

export async function loadMigrationSafetySnapshot(
  query: <T extends Record<string, unknown>>(sql: string, values?: unknown[]) => Promise<{ rows: T[] }>,
): Promise<MigrationSafetySnapshot> {
  const pgmigrations = await tableExists(query, "pgmigrations");
  const v22Applied = pgmigrations
    ? await migrationApplied(query, ACADEMIC_V22_MIGRATION_NAME)
    : false;

  return {
    v22Applied,
    usersCount: await optionalCount(query, "users"),
    gradesCount: await optionalCount(query, "grades"),
    assessmentsCount: await optionalCount(query, "assessments"),
    disciplinesCount: await optionalCount(query, "disciplines"),
  };
}

async function tableExists(
  query: <T extends Record<string, unknown>>(sql: string, values?: unknown[]) => Promise<{ rows: T[] }>,
  table: string,
): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `
      SELECT to_regclass($1) IS NOT NULL AS exists
    `,
    [`public.${table}`],
  );

  return result.rows[0]?.exists === true;
}

async function migrationApplied(
  query: <T extends Record<string, unknown>>(sql: string, values?: unknown[]) => Promise<{ rows: T[] }>,
  name: string,
): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM pgmigrations
        WHERE name = $1
      ) AS exists
    `,
    [name],
  );

  return result.rows[0]?.exists === true;
}

const COUNT_QUERIES = {
  users: "SELECT COUNT(*)::text AS count FROM users",
  grades: "SELECT COUNT(*)::text AS count FROM grades",
  assessments: "SELECT COUNT(*)::text AS count FROM assessments",
  disciplines: "SELECT COUNT(*)::text AS count FROM disciplines",
} as const;

async function optionalCount(
  query: <T extends Record<string, unknown>>(sql: string, values?: unknown[]) => Promise<{ rows: T[] }>,
  table: keyof typeof COUNT_QUERIES,
): Promise<number> {
  if (!(await tableExists(query, table))) {
    return 0;
  }

  const result = await query<{ count: string }>(COUNT_QUERIES[table]);
  return Number(result.rows[0]?.count ?? 0);
}
