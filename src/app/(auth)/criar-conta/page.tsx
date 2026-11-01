import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { FormAlert } from "@/components/shared/form-alert";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Criar conta" };

const errorMessages: Record<string, string> = {
  limite: "Muitas tentativas de cadastro. Aguarde alguns minutos.",
  dados: "Revise os dados informados — nome, e-mail e senha têm requisitos.",
  sessao: "Sua sessão expirou. Entre novamente.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (user) redirect(user.role === "admin" ? "/admin" : "/painel");

  const code = params.erro;
  const next = params.next;
  const signInHref = next
    ? `/entrar?next=${encodeURIComponent(next)}`
    : "/entrar";

  return (
    <div className="space-y-5">
      {code === "cadastrado" ? (
        <FormAlert
          tone="error"
          message={
            <>
              Este e-mail já está cadastrado no Studio Aurora.{" "}
              <Link
                href={signInHref}
                className="font-medium underline underline-offset-4"
              >
                Entre na sua conta
              </Link>{" "}
              ou recupere a senha se não lembrar.
            </>
          }
        />
      ) : code && errorMessages[code] ? (
        <FormAlert tone="error" message={errorMessages[code]} />
      ) : null}

      <SignupForm next={next} />
    </div>
  );
}
