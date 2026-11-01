import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { FormAlert } from "@/components/shared/form-alert";

export const metadata: Metadata = { title: "Recuperar senha" };

const errorMessages: Record<string, string> = {
  limite: "Muitas solicitações. Aguarde alguns minutos antes de tentar de novo.",
  sessao: "Sua sessão expirou. Solicite o link novamente.",
  dados: "Revise o e-mail informado e tente outra vez.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.erro ? errorMessages[params.erro] : undefined;

  return (
    <div className="space-y-4">
      {params.enviado ? (
        <FormAlert
          tone="success"
          message="Solicitação registrada. Se o e-mail estiver cadastrado, o link de redefinição chega em alguns minutos — confira também a caixa de spam."
        />
      ) : null}

      {errorMessage ? <FormAlert tone="error" message={errorMessage} /> : null}

      <ForgotPasswordForm />
    </div>
  );
}
