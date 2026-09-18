import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  DEV_SEED_EMAIL,
  DEV_SEED_PASSWORD,
} from "../config/production-guards";
import { AUTH_EMAIL_MAX_LENGTH, AUTH_PASSWORD_MAX_LENGTH } from "../modules/auth/schema";
import { hashPassword } from "../modules/auth/password";
import { TEST_DATABASE_NAME, parseDatabaseUrl } from "./database-url";

const NAME_MAX_LENGTH = 160;
const RA_MAX_LENGTH = 32;
const COURSE_MAX_LENGTH = 160;

export type InitialUserInput = {
  name: string;
  email: string;
  password: string;
  ra: string;
  course: string;
};

const initialUserSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  email: z
    .string()
    .trim()
    .max(AUTH_EMAIL_MAX_LENGTH)
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(AUTH_PASSWORD_MAX_LENGTH),
  ra: z.string().trim().min(1).max(RA_MAX_LENGTH),
  course: z.string().trim().min(1).max(COURSE_MAX_LENGTH),
});

export function resolveBootstrapDatabaseUrl(env: NodeJS.Dict<string>): string {
  const url = env.DATABASE_URL?.trim();

  if (!url) {
    throw new Error("Refusing to create initial user: DATABASE_URL is required.");
  }

  const testDatabaseUrl = env.TEST_DATABASE_URL?.trim();

  if (testDatabaseUrl && url === testDatabaseUrl) {
    throw new Error("Refusing to create initial user: DATABASE_URL must not be TEST_DATABASE_URL.");
  }

  const parsed = parseDatabaseUrl(url);

  if (parsed.database === TEST_DATABASE_NAME) {
    throw new Error(
      `Refusing to create initial user: database must not be "${TEST_DATABASE_NAME}".`,
    );
  }

  return url;
}

export function parseInitialUserEnv(env: NodeJS.Dict<string>): InitialUserInput {
  const parsed = initialUserSchema.safeParse({
    name: env.INITIAL_USER_NAME,
    email: env.INITIAL_USER_EMAIL,
    password: env.INITIAL_USER_PASSWORD,
    ra: env.INITIAL_USER_RA,
    course: env.INITIAL_USER_COURSE,
  });

  if (!parsed.success) {
    const missing = ["INITIAL_USER_NAME", "INITIAL_USER_EMAIL", "INITIAL_USER_PASSWORD", "INITIAL_USER_RA", "INITIAL_USER_COURSE"].filter(
      (name) => !env[name] || env[name]?.trim() === "",
    );

    if (missing.length > 0) {
      throw new Error(`Refusing to create initial user: missing ${missing.join(", ")}.`);
    }

    throw new Error("Refusing to create initial user: invalid name, email, password, RA or course.");
  }

  if (parsed.data.password === DEV_SEED_PASSWORD) {
    throw new Error(
      "Refusing to create initial user: INITIAL_USER_PASSWORD must not be the documented development password.",
    );
  }

  if (parsed.data.email === DEV_SEED_EMAIL) {
    throw new Error(
      "Refusing to create initial user: INITIAL_USER_EMAIL must not be the documented development seed email.",
    );
  }

  return parsed.data;
}

type UserLookupRow = {
  email: string;
  ra: string | null;
};

export async function createInitialUser(
  query: <T extends Record<string, unknown>>(sql: string, values?: unknown[]) => Promise<{ rows: T[] }>,
  input: InitialUserInput,
): Promise<{ id: string; email: string; ra: string }> {
  const existing = await query<UserLookupRow>(
    `
      SELECT email, ra
      FROM users
      WHERE email = $1 OR ra = $2
    `,
    [input.email, input.ra],
  );

  if (existing.rows.some((row) => row.email === input.email)) {
    throw new Error("Refusing to create initial user: email already exists.");
  }

  if (existing.rows.some((row) => row.ra === input.ra)) {
    throw new Error("Refusing to create initial user: RA already exists.");
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(input.password);

  await query(
    `
      INSERT INTO users (id, name, email, password_hash, ra, course_name, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [id, input.name, input.email, passwordHash, input.ra, input.course, "student"],
  );

  return { id, email: input.email, ra: input.ra };
}
