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

async function migrate(): Promise<void> {
  const databaseUrl = resolveProductionMigrationUrl(process.env);
  const client = new Client(
    postgresPoolConfig(databaseUrl, "production", process.env.DATABASE_SSL_CA),
  );

  console.log(`Production migration target: ${describeMigrationTarget(databaseUrl)}`);
  await client.connect();

  try {
    const snapshot = await loadMigrationSafetySnapshot((sql, values) =>
      client.query(sql, values ?? []),
    );
    assertV22ReshapeSafety(snapshot);

    const { runner } = await import("node-pg-migrate");
    await runner({
      dbClient: client,
      dir: path.join(apiRoot, "migrations"),
      direction: "up",
      migrationsTable: "pgmigrations",
      checkOrder: true,
    });
  } finally {
    await client.end();
  }
}

migrate().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
