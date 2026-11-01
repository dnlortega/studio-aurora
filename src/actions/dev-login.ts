"use server";

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { adminAuditLogs, users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";

/**
 * Acesso rápido de desenvolvimento — "Entrar como".
 *
 * Existe para quem está testando o sistema e não decorou a senha de cada conta.
 * Não existe senha a ser pega do banco, e este não é um favor de segurança:
 * as credenciais são gravadas como hash scrypt (bcrypt nas contas migradas do
 * sistema antigo), uma função de mão única. Nem o código, nem o PostgreSQL, nem
 * eu conseguimos recuperar a senha de um hash — o que a tela de login mostra é
 * justamente o que há no banco: identidade, papel e o tipo de hash.
 *
 * Em vez de armazenar senha em texto plano (o que a especificação do projeto
 * proíbe e nenhum vazamento de backup perdoa), esta ação cria a sessão no
 * servidor e registra na trilha de auditoria. Ela se recusa a funcionar em
 * produção, mesmo que alguém envie o POST direto para a rota.
 */
export async function devImpersonateAction(formData: FormData): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    redirect("/entrar?erro=dev");
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) redirect("/entrar?erro=dev");

  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  const account = rows[0];
  if (!account || !account.isActive) {
    redirect("/entrar?erro=dev");
  }

  await createSession(account.id);
  await db.insert(adminAuditLogs).values({
    actorId: account.id,
    action: "auth.dev_impersonate",
    entity: "users",
    entityId: account.id,
    details: `Sessão de desenvolvimento iniciada como ${account.name} (${account.role}).`,
  });

  redirect(account.role === "admin" ? "/admin" : "/painel");
}
