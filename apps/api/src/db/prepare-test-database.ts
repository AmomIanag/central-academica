import { spawnSync } from "node:child_process";
import path from "node:path";
import { Pool } from "pg";
import { env } from "../config/env";
import { assertProjectDatabase } from "./assert-project-database";
import { assertTestDatabaseUrl } from "./assert-test-database";
import {
  DEV_DATABASE_NAME,
  TEST_DATABASE_NAME,
  parseDatabaseUrl,
} from "./database-url";

assertProjectDatabase(env.databaseUrl);

if (!env.testDatabaseUrl) {
  throw new Error("Missing required environment variable: TEST_DATABASE_URL");
}

assertTestDatabaseUrl(env.testDatabaseUrl);

const development = parseDatabaseUrl(env.databaseUrl);
const test = parseDatabaseUrl(env.testDatabaseUrl);

if (development.database !== DEV_DATABASE_NAME) {
  throw new Error(
    `Refusing to prepare tests: DATABASE_URL must use "${DEV_DATABASE_NAME}". Received: ${development.masked}`,
  );
}

if (test.database !== TEST_DATABASE_NAME) {
  throw new Error(
    `Refusing to prepare tests: TEST_DATABASE_URL must use "${TEST_DATABASE_NAME}". Received: ${test.masked}`,
  );
}

if (env.databaseUrl === env.testDatabaseUrl) {
  throw new Error("Refusing to prepare tests: TEST_DATABASE_URL must be distinct from DATABASE_URL.");
}

const apiRoot = path.resolve(__dirname, "../..");

async function ensureTestDatabase(): Promise<void> {
  const admin = new Pool({ connectionString: env.databaseUrl });

  try {
    const existing = await admin.query<{ exists: number }>(
      `
        SELECT 1 AS exists
        FROM pg_database
        WHERE datname = $1
      `,
      [TEST_DATABASE_NAME],
    );

    if (existing.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${TEST_DATABASE_NAME}`);
      console.log(`Created database ${TEST_DATABASE_NAME}.`);
    } else {
      console.log(`Database ${TEST_DATABASE_NAME} already exists.`);
    }
  } finally {
    await admin.end();
  }
}

function runScript(scriptRelativePath: string): void {
  const tsxCli = require.resolve("tsx/cli");
  const result = spawnSync(process.execPath, [tsxCli, path.join(__dirname, scriptRelativePath)], {
    cwd: apiRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: env.testDatabaseUrl,
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function prepare(): Promise<void> {
  await ensureTestDatabase();
  runScript("run-migrate.ts");
  runScript("seed.ts");
  console.log(`Test database ${TEST_DATABASE_NAME} is ready.`);
}

prepare().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
