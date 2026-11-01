import { eq, sql } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/password";
import { createDatabase } from "@/lib/db";
import { adminAuditLogs, users } from "@/lib/db/schema";

/**
 * Cria o primeiro administrador de forma segura (bootstrap).
 *
 * Uso:
 *   npm run admin:create -- --name "Daniel Ortega" \
 *     --email daniel@exemplo.com --password "SenhaForte123"
 *
 * Ou via variáveis de ambiente ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD.
 * Use --update para redefinir a senha de um admin existente.
 *
 * Este comando roda apenas no servidor/CLI. O cadastro público da aplicação
 * nunca cria contas administrativas.
 */

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

const name = (readFlag("name") ?? process.env.ADMIN_NAME ?? "").trim();
const email = (readFlag("email") ?? process.env.ADMIN_EMAIL ?? "")
  .trim()
  .toLowerCase();
const password = readFlag("password") ?? process.env.ADMIN_PASSWORD ?? "";
const update = hasFlag("update");

function fail(message: string): never {
  console.error(`Erro: ${message}`);
  process.exit(1);
}

if (!name || name.length < 3) {
  fail('informe o nome com --name "Nome Completo" (ou ADMIN_NAME).');
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail("informe um e-mail válido com --email (ou ADMIN_EMAIL).");
}
if (password.length < 12) {
  fail("a senha do administrador deve ter pelo menos 12 caracteres.");
}
if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
  fail("a senha do administrador deve conter letras e números.");
}

async function main() {
  const created = await createDatabase({ autoMigrate: true });
  const { db } = created;

  try {
    const existing = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (existing[0]) {
      if (!update) {
        fail(
          `já existe uma conta com ${email}. Use --update para redefinir a senha e garantir o papel de administrador.`,
        );
      }
      await db
        .update(users)
        .set({
          name,
          role: "admin",
          isActive: true,
          passwordHash: await hashPassword(password),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id));

      await db.insert(adminAuditLogs).values({
        actorId: existing[0].id,
        action: "admin.bootstrap.update",
        entity: "users",
        entityId: existing[0].id,
        details: "Senha redefinida e papel de administrador garantido via CLI.",
      });

      console.log(`Administrador atualizado: ${email}`);
    } else {
      const [inserted] = await db
        .insert(users)
        .values({
          name,
          email,
          role: "admin",
          passwordHash: await hashPassword(password),
          isActive: true,
        })
        .returning({ id: users.id });

      await db.insert(adminAuditLogs).values({
        actorId: inserted.id,
        action: "admin.bootstrap.create",
        entity: "users",
        entityId: inserted.id,
        details: "Conta administrativa criada via CLI (bootstrap).",
      });

      console.log(`Administrador criado: ${email}`);
    }

    console.log(
      "Acesse /entrar com este e-mail e senha. Guarde a senha em um gerenciador de segredos.",
    );
  } finally {
    await created.close();
  }
}

main().catch((error) => {
  console.error(
    "Falha ao criar administrador:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
