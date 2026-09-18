import { afterEach } from "vitest";
import { assertTestDatabase } from "../db/assert-test-database";
import { pool } from "../db/pool";

assertTestDatabase();

afterEach(async () => {
  assertTestDatabase();
  await pool.query("DELETE FROM tasks");
  await pool.query("DELETE FROM session");
});
