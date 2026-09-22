import { describe, expect, it } from "vitest";
import { parseListenHost, parseListenPort, parsePerfLogging, parseTrustProxyHops } from "./runtime";

describe("parseListenPort", () => {
  it("defaults to 3001 outside production", () => {
    expect(parseListenPort(undefined, "development")).toBe(3001);
    expect(parseListenPort("", "test")).toBe(3001);
  });

  it("requires PORT in production", () => {
    expect(() => parseListenPort(undefined, "production")).toThrow(/PORT is required/);
    expect(() => parseListenPort("  ", "production")).toThrow(/PORT is required/);
  });

  it("accepts a positive integer from the environment", () => {
    expect(parseListenPort("8080", "production")).toBe(8080);
  });

  it("rejects non-integer values", () => {
    expect(() => parseListenPort("3001.5", "development")).toThrow(/positive integer/);
    expect(() => parseListenPort("-1", "development")).toThrow(/positive integer/);
    expect(() => parseListenPort("abc", "production")).toThrow(/positive integer/);
  });
});

describe("parseListenHost", () => {
  it("defaults production to 0.0.0.0 and leaves development unbound", () => {
    expect(parseListenHost(undefined, "production")).toBe("0.0.0.0");
    expect(parseListenHost(undefined, "development")).toBeUndefined();
  });

  it("uses an explicit HOST when provided", () => {
    expect(parseListenHost("127.0.0.1", "production")).toBe("127.0.0.1");
    expect(parseListenHost(" 0.0.0.0 ", "development")).toBe("0.0.0.0");
  });
});

describe("parsePerfLogging", () => {
  it("defaults to false", () => {
    expect(parsePerfLogging(undefined)).toBe(false);
    expect(parsePerfLogging("")).toBe(false);
    expect(parsePerfLogging("false")).toBe(false);
    expect(parsePerfLogging("1")).toBe(false);
    expect(parsePerfLogging("yes")).toBe(false);
  });

  it("enables only the boolean string true", () => {
    expect(parsePerfLogging("true")).toBe(true);
    expect(parsePerfLogging("TRUE")).toBe(true);
    expect(parsePerfLogging(" true ")).toBe(true);
  });
});

describe("parseTrustProxyHops", () => {
  it("defaults to 0", () => {
    expect(parseTrustProxyHops(undefined)).toBe(0);
    expect(parseTrustProxyHops("")).toBe(0);
  });

  it("accepts a numeric hop count", () => {
    expect(parseTrustProxyHops("0")).toBe(0);
    expect(parseTrustProxyHops("1")).toBe(1);
    expect(parseTrustProxyHops("2")).toBe(2);
  });

  it("rejects non-integer and out-of-range values", () => {
    expect(() => parseTrustProxyHops("true")).toThrow(/non-negative integer/);
    expect(() => parseTrustProxyHops("1e2")).toThrow(/non-negative integer/);
    expect(() => parseTrustProxyHops("-1")).toThrow(/non-negative integer/);
    expect(() => parseTrustProxyHops("1.5")).toThrow(/non-negative integer/);
    expect(() => parseTrustProxyHops("33")).toThrow(/between 0 and 32/);
  });
});
