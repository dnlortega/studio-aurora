import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { AlertTriangle, CheckCircle2, LogIn, Users } from "lucide-react";

import { devImpersonateAction } from "@/actions/dev-login";
import { LoginForm } from "@/components/auth/login-form";
import { IconSubmitButton } from "@/components/shared/icon-button";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { safeNextPath } from "@/lib/request";

export const metadata: Metadata = { title: "Entrar" };

const errorMessages: Record<string, string> = {
  credenciais: "E-mail ou senha inválidos.",
  limite: "Muitas tentativas de login. Aguarde alguns minutos.",
  sessao: "Sua sessão expirou. Entre novamente.",
  dev: "Este acesso rápido existe só em desenvolvimento.",
  dados: "Revise o e-mail e a senha informados.",
};

/**
 * Como a senha está guardada — serve para o desenvolvedor entender por que não
 * dá para exibir a senha de cada conta.
 */
function hashKind(passwordHash: string): string {
  if (passwordHash.startsWith("scrypt$")) return "scrypt";
  if (passwordHash.startsWith("$2a$") || passwordHash.startsWith("$2b$")) {
    return "bcrypt (legado)";
  }
  return "desconhecido";
}

/**
 * Contas existentes + acesso rápido — apenas em desenvolvimento.
 *
 * Em produção esta seção não é renderizada: mostrar os cadastros na tela de
 * entrada entregaria a qualquer pessoa quem são as clientes do salão. Quem
 * precisa da lista no ar é o administrador, em /admin/clientes.
 *
 * Não existe "mostrar a senha de cada conta": o banco guarda hash scrypt (ou
 * bcrypt nas contas migradas), função de mão única — o valor digitado nunca é
 * recuperável, nem por nós. O botão de cada linha faz o caminho seguro: cria a
 * sessão no servidor, registra na auditoria e leva para o painel daquela conta.
 */
async function devAccounts() {
  if (process.env.NODE_ENV === "production") return null;
  try {
    const db = await getDb();
    const rows = await db
      .select({
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .orderBy(desc(eq(users.role, "admin")), asc(users.createdAt))
      .limit(25);

    return rows.map((row) => ({
      ...row,
      hashKind: hashKind(row.passwordHash),
    }));
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
        <details className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-3.5 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-medium text-amber-900">
            <Users className="size-4" />
            {accounts.length} conta{accounts.length === 1 ? "" : "s"} cadastrada
            {accounts.length === 1 ? "" : "s"}
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-amber-900 uppercase">
              só em desenvolvimento
            </span>
          </summary>

          <p className="mt-2 text-xs text-amber-900/90">
            As senhas não aparecem porque não são guardadas em texto plano: cada
            conta tem um hash (scrypt, ou bcrypt nas contas migradas), que é
            irreversível — nem o banco, nem o código conseguem devolver o valor
            digitado. O botão de cada linha resolve o teste: cria a sessão
            daquela conta no servidor, registra na auditoria e abre o painel
            correspondente. Nada vai para a URL.
          </p>

          <ul className="mt-3 space-y-2">
            {accounts.map((account) => (
              <li
                key={account.email}
                className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-amber-200/70 bg-background p-2.5 text-xs"
              >
                <span className="font-medium text-foreground">
                  {account.name}
                </span>
                <span className="text-muted-foreground">{account.email}</span>
                <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide">
                  {account.role === "admin" ? "administrador" : "cliente"}
                </span>
                <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[0.65rem] tracking-wide">
                  hash: {account.hashKind}
                </span>
                {account.isActive ? null : (
                  <span className="text-[0.65rem] uppercase tracking-wide text-rose-600">
                    desativada
                  </span>
                )}

                <form action={devImpersonateAction} className="ml-auto">
                  <input type="hidden" name="email" value={account.email} />
                  <IconSubmitButton
                    label={`Entrar como ${account.name}`}
                    size="icon-xs"
                    variant="outline"
                    tooltipSide="left"
                    disabled={!account.isActive}
                    icon={<LogIn className="size-3.5" />}
                  />
                </form>
              </li>
            ))}
          </ul>

          <p className="mt-2 text-[0.7rem] text-muted-foreground">
            Some automaticamente em produção. Para ver os cadastros no ar, entre
            como administrador e abra <em>Clientes</em>.
          </p>
        </details>
      ) : null}
    </div>
  );
}
