import { spawnSync } from "node:child_process";
import path from "node:path";
import { env } from "../config/env";
import { assertProjectDatabase } from "./assert-project-database";

assertProjectDatabase();

const apiRoot = path.resolve(__dirname, "../..");
const cli = require.resolve("node-pg-migrate/bin/node-pg-migrate");

const result = spawnSync(
  process.execPath,
  [
    cli,
    "up",
    "--migrations-dir",
    path.join(apiRoot, "migrations"),
    "--envPath",
    path.join(apiRoot, ".env"),
  ],
  {
    cwd: apiRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: env.databaseUrl,
    },
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
