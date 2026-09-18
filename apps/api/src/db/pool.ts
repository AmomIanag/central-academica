import { Pool } from "pg";
import { runtimeDatabaseUrl } from "../config/env";

export const pool = new Pool({
  connectionString: runtimeDatabaseUrl(),
});
