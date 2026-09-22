import { describe, expect, it } from "vitest";
import {
  normalizeDatabaseSslCa,
  postgresPoolConfig,
  POSTGRES_POOL_CONNECTION_TIMEOUT_MS,
  POSTGRES_POOL_IDLE_TIMEOUT_MS,
  POSTGRES_POOL_KEEPALIVE_INITIAL_DELAY_MS,
  POSTGRES_POOL_MAX,
  POSTGRES_POOL_MIN,
  resolvePostgresSsl,
} from "./pool-config";

const LOCAL_URL = "postgresql://central:central@localhost:5433/central_academica";
const HOSTED_URL = "postgresql://app:unique-secret@db.internal:5432/central_academica";
const HOSTED_SSL_URL = `${HOSTED_URL}?sslmode=require`;
const SAMPLE_CA = "-----BEGIN CERTIFICATE-----\nMIIBfakeCA\n-----END CERTIFICATE-----";

describe("normalizeDatabaseSslCa", () => {
  it("returns undefined for missing or blank values", () => {
    expect(normalizeDatabaseSslCa(undefined)).toBeUndefined();
    expect(normalizeDatabaseSslCa("")).toBeUndefined();
    expect(normalizeDatabaseSslCa("   ")).toBeUndefined();
  });

  it("preserves multiline PEM values", () => {
    expect(normalizeDatabaseSslCa(SAMPLE_CA)).toBe(SAMPLE_CA);
  });

  it("normalizes escaped newlines from hosting dashboards", () => {
    expect(
      normalizeDatabaseSslCa(
        "-----BEGIN CERTIFICATE-----\\nMIIBfakeCA\\n-----END CERTIFICATE-----",
      ),
    ).toBe(SAMPLE_CA);
  });
});

describe("resolvePostgresSsl", () => {
  it("does not enable TLS for local development URLs", () => {
    expect(resolvePostgresSsl(LOCAL_URL, "development")).toBeUndefined();
    expect(resolvePostgresSsl(LOCAL_URL, "test")).toBeUndefined();
    expect(resolvePostgresSsl(LOCAL_URL, "development", SAMPLE_CA)).toBeUndefined();
  });

  it("enables verified TLS when sslmode requests a secure connection", () => {
    expect(resolvePostgresSsl(HOSTED_SSL_URL, "development")).toEqual({ rejectUnauthorized: true });
    expect(resolvePostgresSsl(`${HOSTED_URL}?sslmode=verify-full`, "production")).toEqual({
      rejectUnauthorized: true,
    });
  });

  it("attaches a trusted CA without disabling verification", () => {
    expect(resolvePostgresSsl(HOSTED_SSL_URL, "production", SAMPLE_CA)).toEqual({
      rejectUnauthorized: true,
      ca: SAMPLE_CA,
    });
  });

  it("keeps certificate validation when no CA is provided", () => {
    const ssl = resolvePostgresSsl(HOSTED_SSL_URL, "production", undefined);

    expect(ssl).toEqual({ rejectUnauthorized: true });
    expect(ssl).not.toEqual(expect.objectContaining({ rejectUnauthorized: false }));
    expect(ssl).not.toHaveProperty("ca");
  });

  it("enables verified TLS in production for non-loopback hosts without sslmode", () => {
    expect(resolvePostgresSsl(HOSTED_URL, "production")).toEqual({ rejectUnauthorized: true });
  });

  it("does not enable TLS when sslmode=disable", () => {
    expect(resolvePostgresSsl(`${HOSTED_URL}?sslmode=disable`, "production", SAMPLE_CA)).toBeUndefined();
  });

  it("does not treat production loopback as a hosted TLS endpoint", () => {
    expect(resolvePostgresSsl(LOCAL_URL, "production", SAMPLE_CA)).toBeUndefined();
  });
});

describe("postgresPoolConfig", () => {
  it("strips sslmode from the connection string and sets verified ssl", () => {
    const config = postgresPoolConfig(HOSTED_SSL_URL, "production");

    expect(config.connectionString).not.toContain("sslmode=");
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
  });

  it("passes DATABASE_SSL_CA as the trusted CA for TLS connections", () => {
    const config = postgresPoolConfig(
      HOSTED_SSL_URL,
      "production",
      "-----BEGIN CERTIFICATE-----\\nMIIBfakeCA\\n-----END CERTIFICATE-----",
    );

    expect(config.ssl).toEqual({
      rejectUnauthorized: true,
      ca: SAMPLE_CA,
    });
  });

  it("omits ssl for local development even if a CA is present", () => {
    const config = postgresPoolConfig(LOCAL_URL, "development", SAMPLE_CA);

    expect(config.connectionString).toContain("localhost:5433");
    expect(config.ssl).toBeUndefined();
  });

  it("does not disable certificate verification", () => {
    const withCa = postgresPoolConfig(HOSTED_SSL_URL, "production", SAMPLE_CA);
    const withoutCa = postgresPoolConfig(HOSTED_SSL_URL, "production");

    expect(withCa.ssl).not.toEqual({ rejectUnauthorized: false });
    expect(withoutCa.ssl).not.toEqual({ rejectUnauthorized: false });
    expect(withCa.ssl).not.toBe(false);
    expect(withoutCa.ssl).not.toBe(false);
    expect(withoutCa.ssl).toEqual({ rejectUnauthorized: true });
  });

  it("sets a small explicit pool that keeps a few warm clients in production", () => {
    const production = postgresPoolConfig(HOSTED_SSL_URL, "production");
    const development = postgresPoolConfig(LOCAL_URL, "development");
    const test = postgresPoolConfig(LOCAL_URL, "test");

    expect(production).toMatchObject({
      max: POSTGRES_POOL_MAX,
      min: POSTGRES_POOL_MIN,
      idleTimeoutMillis: POSTGRES_POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: POSTGRES_POOL_CONNECTION_TIMEOUT_MS,
      keepAlive: true,
      keepAliveInitialDelayMillis: POSTGRES_POOL_KEEPALIVE_INITIAL_DELAY_MS,
    });
    expect(development.min).toBe(POSTGRES_POOL_MIN);
    expect(test.min).toBe(0);
    expect(POSTGRES_POOL_MAX).toBe(10);
    expect(POSTGRES_POOL_MIN).toBe(3);
    expect(POSTGRES_POOL_IDLE_TIMEOUT_MS).toBe(60_000);
  });
});
