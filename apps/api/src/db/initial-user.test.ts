import { describe, expect, it } from "vitest";
import { DEV_SEED_EMAIL, DEV_SEED_PASSWORD } from "../config/production-guards";
import { createInitialUser, parseInitialUserEnv, resolveBootstrapDatabaseUrl } from "./initial-user";

const VALID_ENV = {
  INITIAL_USER_NAME: "Aluno Produção",
  INITIAL_USER_EMAIL: "  Aluno@Fiap.Com  ",
  INITIAL_USER_PASSWORD: "unique-production-student-password",
  INITIAL_USER_RA: "RM123456",
  INITIAL_USER_COURSE: "Análise e Desenvolvimento de Sistemas",
};

describe("resolveBootstrapDatabaseUrl", () => {
  it("requires DATABASE_URL and never uses TEST_DATABASE_URL", () => {
    expect(() => resolveBootstrapDatabaseUrl({})).toThrow(/DATABASE_URL is required/);
    expect(() =>
      resolveBootstrapDatabaseUrl({
        DATABASE_URL: "postgresql://central:central@localhost:5433/central_academica_test",
        TEST_DATABASE_URL: "postgresql://central:central@localhost:5433/central_academica_test",
      }),
    ).toThrow(/must not be TEST_DATABASE_URL/);
    expect(() =>
      resolveBootstrapDatabaseUrl({
        DATABASE_URL: "postgresql://central:central@localhost:5433/central_academica_test",
      }),
    ).toThrow(/central_academica_test/);
  });

  it("accepts the runtime DATABASE_URL", () => {
    expect(
      resolveBootstrapDatabaseUrl({
        DATABASE_URL: "postgresql://central:central@localhost:5433/central_academica",
        TEST_DATABASE_URL: "postgresql://central:central@localhost:5433/central_academica_test",
      }),
    ).toBe("postgresql://central:central@localhost:5433/central_academica");
  });
});

describe("parseInitialUserEnv", () => {
  it("validates and normalizes the initial user contract", () => {
    expect(parseInitialUserEnv(VALID_ENV)).toEqual({
      name: "Aluno Produção",
      email: "aluno@fiap.com",
      password: "unique-production-student-password",
      ra: "RM123456",
      course: "Análise e Desenvolvimento de Sistemas",
    });
  });

  it("fails clearly when required fields are absent", () => {
    expect(() => parseInitialUserEnv({})).toThrow(
      /missing INITIAL_USER_NAME, INITIAL_USER_EMAIL, INITIAL_USER_PASSWORD, INITIAL_USER_RA, INITIAL_USER_COURSE/,
    );
  });

  it("rejects the documented development password and seed email", () => {
    expect(() =>
      parseInitialUserEnv({
        ...VALID_ENV,
        INITIAL_USER_PASSWORD: DEV_SEED_PASSWORD,
      }),
    ).toThrow(/documented development password/);

    expect(() =>
      parseInitialUserEnv({
        ...VALID_ENV,
        INITIAL_USER_EMAIL: DEV_SEED_EMAIL,
      }),
    ).toThrow(/documented development seed email/);
  });
});

describe("createInitialUser", () => {
  it("inserts a hashed student user and does not overwrite duplicates", async () => {
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const query = async <T extends Record<string, unknown>>(sql: string, values?: unknown[]) => {
      statements.push({ sql, values: values ?? [] });

      if (sql.includes("SELECT email, ra")) {
        return { rows: [] as T[] };
      }

      return { rows: [] as T[] };
    };

    const created = await createInitialUser(query, parseInitialUserEnv(VALID_ENV));

    expect(created.email).toBe("aluno@fiap.com");
    expect(created.ra).toBe("RM123456");
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    const insert = statements.find((statement) => statement.sql.includes("INSERT INTO users"));
    expect(insert?.values[3]).toEqual(expect.stringMatching(/^scrypt\$/));
    expect(insert?.values).not.toContain("unique-production-student-password");
    expect(insert?.values[6]).toBe("student");
  });

  it("does not overwrite an existing email or RA", async () => {
    const emailConflict = async <T extends Record<string, unknown>>(sql: string) => {
      if (sql.includes("SELECT email, ra")) {
        return {
          rows: [{ email: "aluno@fiap.com", ra: "RM999999" }] as unknown as T[],
        };
      }

      throw new Error("insert should not run");
    };

    await expect(createInitialUser(emailConflict, parseInitialUserEnv(VALID_ENV))).rejects.toThrow(
      /email already exists/,
    );

    const raConflict = async <T extends Record<string, unknown>>(sql: string) => {
      if (sql.includes("SELECT email, ra")) {
        return {
          rows: [{ email: "other@fiap.com", ra: "RM123456" }] as unknown as T[],
        };
      }

      throw new Error("insert should not run");
    };

    await expect(createInitialUser(raConflict, parseInitialUserEnv(VALID_ENV))).rejects.toThrow(
      /RA already exists/,
    );
  });
});
