import type { Metadata } from "next";
import { AlertTriangle, ArrowLeft, KeyRound } from "lucide-react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { IconLink } from "@/components/shared/icon-button";
import { findPasswordResetToken } from "@/lib/auth/reset";

export const metadata: Metadata = { title: "Redefinir senha" };

const errorMessages: Record<string, string> = {
  token: "Este link é inválido ou expirou. Solicite um novo link.",
  dados: "Revise a nova senha: são necessárias letras, números e 8 caracteres.",
  limite: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; erro?: string }>;
}) {
  const { token, erro } = await searchParams;
  const valid = token ? await findPasswordResetToken(token) : null;

  if (!token || !valid) {
    return (
      <div className="space-y-5">
        <div className="grid size-11 place-items-center rounded-full bg-amber-100 text-amber-800">
          <AlertTriangle className="size-5" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-medium">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            Por segurança, os links de redefinição valem por 1 hora e só podem
            ser usados uma vez. Solicite um novo link para continuar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconLink
            href="/recuperar-senha"
            label="Solicitar novo link"
            tooltipSide="right"
          >
            <KeyRound className="size-4" />
          </IconLink>
          <IconLink
            href="/entrar"
            label="Voltar para o login"
            variant="ghost"
            tooltipSide="right"
          >
            <ArrowLeft className="size-4" />
          </IconLink>
        </div>
      </div>
    );
  }

  const message = erro ? errorMessages[erro] : undefined;

  return (
    <div className="space-y-4">
      {message ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {message}
        </div>
      ) : null}
      <ResetPasswordForm token={token} />
    </div>
  );
}
