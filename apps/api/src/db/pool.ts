import { Pool } from "pg";
import { env, runtimeDatabaseUrl } from "../config/env";
import { instrumentPoolConnect } from "../lib/perf";
import { postgresPoolConfig } from "./pool-config";

export const pool = new Pool(
  postgresPoolConfig(runtimeDatabaseUrl(), env.nodeEnv, env.databaseSslCa),
);

instrumentPoolConnect(pool);
