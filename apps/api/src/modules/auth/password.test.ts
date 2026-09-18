import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, verifyPasswordOrDummy } from "./password";

const EXISTING_SERIALIZED_HASH =
  "scrypt$16384$8$1$63656e7472616c2d616361642d73656564$84694916be3d4b32f1058a9554d2be8e26f897dc9816bdbe135b5c3d0461dc5b84538da695932146d8b4ff345fd838b37ab6e918891252753eb691320a746785";

describe("password hashing", () => {
  it("hashes asynchronously with scrypt and verifies using timing-safe comparison", async () => {
    const hashing = hashPassword("secret-password");

    expect(hashing).toBeInstanceOf(Promise);

    const hash = await hashing;

    expect(hash.startsWith("scrypt$16384$8$1$")).toBe(true);
    await expect(verifyPassword("secret-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("other-password", hash)).resolves.toBe(false);
  });

  it("verifies the existing serialized seed hash format", async () => {
    const generated = await hashPassword("admin123", Buffer.from("central-acad-seed"));

    expect(generated).toBe(EXISTING_SERIALIZED_HASH);
    await expect(verifyPassword("admin123", EXISTING_SERIALIZED_HASH)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", EXISTING_SERIALIZED_HASH)).resolves.toBe(false);
    await expect(verifyPassword("admin123", "not-a-hash")).resolves.toBe(false);
  });

  it("rejects a missing hash after performing dummy scrypt work", async () => {
    const verifying = verifyPasswordOrDummy("admin123", null);

    expect(verifying).toBeInstanceOf(Promise);
    await expect(verifying).resolves.toBe(false);
  });
});
