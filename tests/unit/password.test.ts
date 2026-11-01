import { hashSync } from "bcryptjs";
import { describe, expect, it } from "vitest";

import {
  checkPasswordStrength,
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
} from "@/lib/auth/password";

describe("hash de senha (scrypt)", () => {
  it("gera hashes diferentes para a mesma senha e valida corretamente", async () => {
    const first = await hashPassword("Aurora123");
    const second = await hashPassword("Aurora123");

    expect(first).not.toBe(second);
    expect(first.startsWith("scrypt$")).toBe(true);
    await expect(verifyPassword("Aurora123", first)).resolves.toBe(true);
    await expect(verifyPassword("Aurora123", second)).resolves.toBe(true);
    await expect(verifyPassword("Aurora124", first)).resolves.toBe(false);
  });

  it("aceita hash bcrypt do sistema antigo e pede rehash", async () => {
    const legacy = hashSync("Aurora123", 10);

    await expect(verifyPassword("Aurora123", legacy)).resolves.toBe(true);
    await expect(verifyPassword("Aurora124", legacy)).resolves.toBe(false);
    expect(needsPasswordRehash(legacy)).toBe(true);

    const modern = await hashPassword("Aurora123");
    expect(needsPasswordRehash(modern)).toBe(false);
  });

  it("rejeita hashes inválidos sem lançar erro", async () => {
    await expect(verifyPassword("Aurora123", "")).resolves.toBe(false);
    await expect(verifyPassword("Aurora123", "texto-invalido")).resolves.toBe(
      false,
    );
    await expect(verifyPassword("Aurora123", "md5$abc$def")).resolves.toBe(
      false,
    );
  });
});

describe("força de senha", () => {
  it("exige tamanho mínimo e mistura de letras e números", () => {
    expect(checkPasswordStrength("curta1").ok).toBe(false);
    expect(checkPasswordStrength("somenteletras").ok).toBe(false);
    expect(checkPasswordStrength("12345678").ok).toBe(false);
    expect(checkPasswordStrength("Aurora123").ok).toBe(true);
    expect(checkPasswordStrength("Café1234").ok).toBe(true);
  });
});
