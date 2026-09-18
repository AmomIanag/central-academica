import { describe, expect, it } from "vitest";
import { postgresPoolConfig, resolvePostgresSsl } from "./pool-config";

const LOCAL_URL = "postgresql://central:central@localhost:5433/central_academica";
const HOSTED_URL = "postgresql://app:unique-secret@db.internal:5432/central_academica";
const HOSTED_SSL_URL = `${HOSTED_URL}?sslmode=require`;

describe("resolvePostgresSsl", () => {
  it("does not enable TLS for local development URLs", () => {
    expect(resolvePostgresSsl(LOCAL_URL, "development")).toBeUndefined();
    expect(resolvePostgresSsl(LOCAL_URL, "test")).toBeUndefined();
  });

  it("enables verified TLS when sslmode requests a secure connection", () => {
    expect(resolvePostgresSsl(HOSTED_SSL_URL, "development")).toEqual({ rejectUnauthorized: true });
    expect(resolvePostgresSsl(`${HOSTED_URL}?sslmode=verify-full`, "production")).toEqual({
      rejectUnauthorized: true,
    });
  });

  it("enables verified TLS in production for non-loopback hosts without sslmode", () => {
    expect(resolvePostgresSsl(HOSTED_URL, "production")).toEqual({ rejectUnauthorized: true });
  });

  it("does not enable TLS when sslmode=disable", () => {
    expect(resolvePostgresSsl(`${HOSTED_URL}?sslmode=disable`, "production")).toBeUndefined();
  });

  it("does not treat production loopback as a hosted TLS endpoint", () => {
    expect(resolvePostgresSsl(LOCAL_URL, "production")).toBeUndefined();
  });
});

describe("postgresPoolConfig", () => {
  it("strips sslmode from the connection string and sets verified ssl", () => {
    const config = postgresPoolConfig(HOSTED_SSL_URL, "production");

    expect(config.connectionString).not.toContain("sslmode=");
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
  });

  it("omits ssl for local development", () => {
    const config = postgresPoolConfig(LOCAL_URL, "development");

    expect(config.connectionString).toContain("localhost:5433");
    expect(config.ssl).toBeUndefined();
  });

  it("does not disable certificate verification", () => {
    const config = postgresPoolConfig(HOSTED_SSL_URL, "production");
    expect(config.ssl).not.toEqual({ rejectUnauthorized: false });
    expect(config.ssl).not.toBe(false);
  });
});
