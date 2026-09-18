import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, verifyPasswordOrDummy } from "./password";

describe("password hashing", () => {
  it("hashes with scrypt and verifies using timing-safe comparison", () => {
    const hash = hashPassword("secret-password");

    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("secret-password", hash)).toBe(true);
    expect(verifyPassword("other-password", hash)).toBe(false);
  });

  it("verifies the seed hash format", () => {
    const hash = hashPassword("admin123", Buffer.from("central-acad-seed"));

    expect(verifyPassword("admin123", hash)).toBe(true);
    expect(verifyPassword("admin123", "not-a-hash")).toBe(false);
  });

  it("rejects a missing hash after performing dummy scrypt work", () => {
    expect(verifyPasswordOrDummy("admin123", null)).toBe(false);
  });
});
