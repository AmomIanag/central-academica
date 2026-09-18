import { afterEach } from "vitest";
import { assertTestDatabase } from "../db/assert-test-database";
import { pool } from "../db/pool";
import { resetLoginRateLimiters } from "../modules/auth/login-rate-limit";

assertTestDatabase();

afterEach(async () => {
  assertTestDatabase();
  await resetLoginRateLimiters();
  await pool.query("DELETE FROM tasks");
  await pool.query("DELETE FROM session");
});
