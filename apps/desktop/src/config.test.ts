import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_APP_URL,
  getTrustedOrigin,
  parseHttpUrl,
  resolveAppUrl,
} from "./config";

describe("parseHttpUrl", () => {
  it("accepts https URLs", () => {
    const parsed = parseHttpUrl(
      "https://central-academica-web-one.vercel.app/dashboard",
    );
    assert.equal(parsed.protocol, "https:");
    assert.equal(parsed.hostname, "central-academica-web-one.vercel.app");
  });

  it("accepts http URLs for local overrides", () => {
    const parsed = parseHttpUrl("http://localhost:3000");
    assert.equal(parsed.origin, "http://localhost:3000");
  });

  it("rejects credentials, empty values and non-http protocols", () => {
    assert.throws(() => parseHttpUrl(""), /inválida/);
    assert.throws(() => parseHttpUrl("not-a-url"), /inválida/);
    assert.throws(() => parseHttpUrl("file:///tmp/index.html"), /inválida/);
    assert.throws(() => parseHttpUrl("javascript:alert(1)"), /inválida/);
    assert.throws(
      () => parseHttpUrl("https://user:pass@example.com"),
      /credenciais/,
    );
  });
});

describe("resolveAppUrl", () => {
  it("defaults to the production Vercel origin", () => {
    const parsed = resolveAppUrl({});
    assert.equal(parsed.href, `${DEFAULT_APP_URL}/`);
    assert.equal(getTrustedOrigin(parsed), DEFAULT_APP_URL);
  });

  it("uses DESKTOP_APP_URL when it is a valid http(s) URL", () => {
    const parsed = resolveAppUrl({
      DESKTOP_APP_URL: "https://preview.example.com/",
    });
    assert.equal(parsed.origin, "https://preview.example.com");
  });

  it("ignores a blank override", () => {
    const parsed = resolveAppUrl({ DESKTOP_APP_URL: "   " });
    assert.equal(parsed.origin, DEFAULT_APP_URL);
  });
});
