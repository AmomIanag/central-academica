import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

function deriveKey(
  password: string,
  salt: Buffer,
  keylen: number,
  N: number,
  r: number,
  p: number,
): Buffer {
  return scryptSync(password, salt, keylen, { N, r, p });
}

export function hashPassword(password: string, salt: Buffer = randomBytes(16)): string {
  const key = deriveKey(password, salt, SCRYPT_KEYLEN, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${key.toString("hex")}`;
}

const DUMMY_HASH = hashPassword("__central-academica-dummy__");

type ParsedHash = {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  key: Buffer;
};

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split("$");

  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return null;
  }

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], "hex");
  const key = Buffer.from(parts[5], "hex");

  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || salt.length === 0 || key.length === 0) {
    return null;
  }

  return { N, r, p, salt, key };
}

export function verifyPassword(password: string, stored: string): boolean {
  const parsed = parseHash(stored);

  if (!parsed) {
    return false;
  }

  try {
    const derived = deriveKey(password, parsed.salt, parsed.key.length, parsed.N, parsed.r, parsed.p);

    if (derived.length !== parsed.key.length) {
      return false;
    }

    return timingSafeEqual(derived, parsed.key);
  } catch {
    return false;
  }
}

export function verifyPasswordOrDummy(password: string, storedHash: string | null): boolean {
  const matches = verifyPassword(password, storedHash ?? DUMMY_HASH);
  return storedHash !== null && matches;
}
