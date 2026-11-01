import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { compare as compareBcrypt } from "bcryptjs";

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;
const PREFIX = "scrypt";

/** Hash de senha com scrypt + salt aleatório (formato autodescritivo). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(
    password.normalize("NFKC"),
    salt,
    KEY_LENGTH,
  )) as Buffer;

  return [
    PREFIX,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

/**
 * Hashes bcrypt ($2a/$2b/$2y) vieram do sistema anterior (Prisma). Aceitamos
 * a verificação para não travar quem já tinha conta e migramos o formato no
 * primeiro login bem-sucedido.
 */
export function needsPasswordRehash(storedHash: string): boolean {
  return !storedHash.startsWith(`${PREFIX}$`);
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  try {
    if (/^\$2[aby]\$/.test(storedHash)) {
      return await compareBcrypt(password.normalize("NFKC"), storedHash);
    }

    const [prefix, saltPart, hashPart] = storedHash.split("$");
    if (prefix !== PREFIX || !saltPart || !hashPart) return false;

    const salt = Buffer.from(saltPart, "base64url");
    const expected = Buffer.from(hashPart, "base64url");
    const derived = (await scrypt(
      password.normalize("NFKC"),
      salt,
      expected.length,
    )) as Buffer;

    return (
      expected.length === derived.length && timingSafeEqual(expected, derived)
    );
  } catch {
    return false;
  }
}

export type PasswordStrength = {
  ok: boolean;
  message?: string;
};

export function checkPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) {
    return { ok: false, message: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    return {
      ok: false,
      message: "Use ao menos uma letra e um número na senha.",
    };
  }
  return { ok: true };
}
