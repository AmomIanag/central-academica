import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeExternalUrl, isTrustedNavigationUrl, tryParseUrl } from "./urls";

const trustedOrigin = "https://central-academica-web-one.vercel.app";

describe("isTrustedNavigationUrl", () => {
  it("allows same-origin paths and rejects lookalike hosts", () => {
    assert.equal(
      isTrustedNavigationUrl(`${trustedOrigin}/notas`, trustedOrigin),
      true,
    );
    assert.equal(
      isTrustedNavigationUrl(`${trustedOrigin}/login`, trustedOrigin),
      true,
    );
    assert.equal(
      isTrustedNavigationUrl(
        "https://central-academica-web-one.vercel.app.attacker.com",
        trustedOrigin,
      ),
      false,
    );
  });

  it("rejects file, javascript and invalid URLs", () => {
    assert.equal(
      isTrustedNavigationUrl("file:///C:/Windows/notepad.exe", trustedOrigin),
      false,
    );
    assert.equal(
      isTrustedNavigationUrl("javascript:alert(1)", trustedOrigin),
      false,
    );
    assert.equal(isTrustedNavigationUrl("not a url", trustedOrigin), false);
    assert.equal(tryParseUrl("not a url"), null);
  });
});

describe("isSafeExternalUrl", () => {
  it("allows only http and https without credentials", () => {
    assert.equal(isSafeExternalUrl("https://www.fiap.com.br"), true);
    assert.equal(isSafeExternalUrl("http://example.com/help"), true);
    assert.equal(isSafeExternalUrl("file:///etc/passwd"), false);
    assert.equal(isSafeExternalUrl("javascript:alert(1)"), false);
    assert.equal(isSafeExternalUrl("data:text/html,hi"), false);
    assert.equal(isSafeExternalUrl("https://user:pass@example.com"), false);
  });
});
