import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq, asc } from "drizzle-orm";
import { AlertTriangle, CheckCircle2, Users } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { safeNextPath } from "@/lib/request";

export const metadata: Metadata = { title: "Entrar" };

const errorMessages: Record<string, string> = {
  credenciais: "E-mail ou senha inválidos.",
  limite: "Muitas tentativas de login. Aguarde alguns minutos.",
  sessao: "Sua sessão expirou. Entre novamente.",
  dados: "Revise o e-mail e a senha informados.",
};

/**
 * Lista de contas existentes — apenas para desenvolvimento.
 *
 * Em produção esta seção não é renderizada: expor os cadastros na tela de
 * entrada permitiria a qualquer pessoa descobrir quem é cliente do salão.
 * Quem precisa da lista no ar é o administrador, em /admin/clientes.
 */
async function devAccounts() {
  if (process.env.NODE_ENV === "production") return null;
  try {
    const db = await getDb();
    return await db
      .select({
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .orderBy(desc(eq(users.role, "admin")), asc(users.createdAt))
      .limit(25);
  } catch {
    return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    redefinida?: string;
    erro?: string;
  }>;
}) {
  const [params, user, accounts] = await Promise.all([
    searchParams,
    getCurrentUser(),
    devAccounts(),
  ]);

  if (user) {
    redirect(
      safeNextPath(
        params.next,
        user.role === "admin" ? "/admin" : "/painel",
      ),
    );
  }

  const errorMessage = params.erro
    ? (errorMessages[params.erro] ?? errorMessages.dados)
    : undefined;

  return (
    <div className="space-y-5">
      {params.redefinida ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-sm text-emerald-900"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          Senha redefinida com sucesso. Entre com sua nova senha.
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {errorMessage}
        </div>
      ) : null}

      <LoginForm next={params.next} />

      {accounts && accounts.length > 0 ? (
        <details className="rounded-xl border border-dashed border-border bg-muted/30 p-3.5 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-medium text-muted-foreground">
            <Users className="size-4" />
            Usuários cadastrados
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-amber-900 uppercase">
              só em desenvolvimento
            </span>
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Esta lista some automaticamente em produção. Para ver os cadastros
            no ar, entre como administrador e abra <em>Clientes</em>.
          </p>
          <ul className="mt-3 space-y-1.5">
            {accounts.map((account) => (
              <li
                key={account.email}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs"
              >
                <span className="font-medium text-foreground">
                  {account.name}
                </span>
                <span className="text-muted-foreground">{account.email}</span>
                <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide">
                  {account.role === "admin" ? "administrador" : "cliente"}
                </span>
                {account.isActive ? null : (
                  <span className="text-[0.65rem] uppercase tracking-wide text-rose-600">
                    desativada
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
