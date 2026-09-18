import { describe, expect, it } from "vitest";
import { createApiProxyRewrites, parseApiProxyTarget } from "./api-proxy";

describe("parseApiProxyTarget", () => {
  it("returns null when unset", () => {
    expect(parseApiProxyTarget(undefined)).toBeNull();
    expect(parseApiProxyTarget("")).toBeNull();
  });

  it("accepts an http(s) origin and strips a trailing slash", () => {
    expect(parseApiProxyTarget("https://api.example.com")).toBe("https://api.example.com");
    expect(parseApiProxyTarget("https://api.example.com/")).toBe("https://api.example.com");
  });

  it("rejects credentials, paths and non-http URLs", () => {
    expect(() => parseApiProxyTarget("https://user:pass@api.example.com")).toThrow(/credentials/);
    expect(() => parseApiProxyTarget("https://api.example.com/v1")).toThrow(/without a path/);
    expect(() => parseApiProxyTarget("ftp://api.example.com")).toThrow(/http\(s\) origin/);
    expect(() => parseApiProxyTarget("not-a-url")).toThrow(/http\(s\) origin/);
  });
});

describe("createApiProxyRewrites", () => {
  it("maps /api/:path* to the server-side proxy target", () => {
    expect(
      createApiProxyRewrites({
        API_PROXY_TARGET: "https://railway-api.example",
        NEXT_PUBLIC_API_URL: "/api",
      }),
    ).toEqual([
      {
        source: "/api/:path*",
        destination: "https://railway-api.example/:path*",
      },
    ]);
  });

  it("keeps local development without a rewrite", () => {
    expect(
      createApiProxyRewrites({
        NEXT_PUBLIC_API_URL: "http://localhost:3001",
      }),
    ).toEqual([]);
  });

  it("requires API_PROXY_TARGET when the browser uses /api", () => {
    expect(() =>
      createApiProxyRewrites({
        NEXT_PUBLIC_API_URL: "/api",
      }),
    ).toThrow(/API_PROXY_TARGET is required/);
  });

  it("does not read a public proxy target variable", () => {
    expect(
      createApiProxyRewrites({
        NEXT_PUBLIC_API_URL: "http://localhost:3001",
        NEXT_PUBLIC_API_PROXY_TARGET: "https://should-not-be-used.example",
      }),
    ).toEqual([]);
  });
});
