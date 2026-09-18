import path from "node:path";
import { Client } from "pg";
import dotenv from "dotenv";
import { postgresPoolConfig } from "./pool-config";
import {
  createInitialUser,
  parseInitialUserEnv,
  resolveBootstrapDatabaseUrl,
} from "./initial-user";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function run(): Promise<void> {
  const databaseUrl = resolveBootstrapDatabaseUrl(process.env);
  const input = parseInitialUserEnv(process.env);
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const client = new Client(
    postgresPoolConfig(databaseUrl, nodeEnv, process.env.DATABASE_SSL_CA),
  );
  await client.connect();

  try {
    const created = await createInitialUser(
      (sql, values) => client.query(sql, values ?? []),
      input,
    );
    console.log(`Created initial student user email=${created.email} ra=${created.ra} id=${created.id}`);
  } finally {
    await client.end();
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
