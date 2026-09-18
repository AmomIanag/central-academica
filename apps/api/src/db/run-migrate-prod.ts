import { spawnSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";
import dotenv from "dotenv";
import { postgresPoolConfig } from "./pool-config";
import {
  assertV22ReshapeSafety,
  describeMigrationTarget,
  loadMigrationSafetySnapshot,
  resolveProductionMigrationUrl,
} from "./production-migrate";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const apiRoot = path.resolve(__dirname, "../..");

async function preflight(databaseUrl: string): Promise<void> {
  const client = new Client(postgresPoolConfig(databaseUrl, "production"));
  await client.connect();

  try {
    const snapshot = await loadMigrationSafetySnapshot((sql, values) =>
      client.query(sql, values ?? []),
    );
    assertV22ReshapeSafety(snapshot);
  } finally {
    await client.end();
  }
}

async function migrate(): Promise<void> {
  const databaseUrl = resolveProductionMigrationUrl(process.env);
  console.log(`Production migration target: ${describeMigrationTarget(databaseUrl)}`);
  await preflight(databaseUrl);

  const cli = require.resolve("node-pg-migrate/bin/node-pg-migrate");
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "up",
      "--migrations-dir",
      path.join(apiRoot, "migrations"),
    ],
    {
      cwd: apiRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

migrate().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
