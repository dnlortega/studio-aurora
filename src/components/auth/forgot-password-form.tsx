"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Send } from "lucide-react";
import type { z } from "zod";

import { forgotPasswordAction, forgotPasswordFormAction } from "@/actions/auth";
import { TextField } from "@/components/forms/text-field";
import {
  IconLink,
  IconSubmitButton,
} from "@/components/shared/icon-button";
import { forgotPasswordSchema } from "@/lib/validation/schemas";

type ForgotValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
      if (!result.ok) {
        toast.error(result.message);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof ForgotValues, { message });
          }
        }
        return;
      }
      setSent(true);
      setPreviewUrl(result.data?.previewUrl ?? null);
      toast.success("Solicitação registrada.");
    });
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="eyebrow">Recuperar acesso</p>
        <h1 className="text-3xl font-medium">Esqueceu a senha?</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Informe o e-mail da sua conta. Enviaremos um link válido por 1 hora
          para você criar uma nova senha.
        </p>
      </div>

      <form
        action={forgotPasswordFormAction}
        onSubmit={onSubmit}
        className="space-y-4"
        noValidate
      >
        <TextField
          control={form.control}
          name="email"
          label="E-mail"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
        />
        <IconSubmitButton
          label="Enviar link de redefinição"
          pending={pending}
          size="icon-lg"
          icon={<Send className="size-4" />}
        />
      </form>

      {sent ? (
        <div
          role="status"
          className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900"
        >
          <p>
            Se este e-mail estiver cadastrado, o link de redefinição foi
            preparado. Confira também a caixa de spam.
          </p>
          {previewUrl ? (
            <div className="space-y-2 rounded-lg border border-emerald-200 bg-white/70 p-3">
              <p className="text-xs font-medium text-emerald-900">
                Provedor de e-mail não configurado neste ambiente. Nenhum e-mail
                foi enviado. Use o link abaixo para continuar o teste:
              </p>
              <Link
                href={previewUrl}
                className="inline-flex items-center gap-1.5 break-all text-xs font-medium underline underline-offset-4"
              >
                Abrir link de redefinição
                <ExternalLink className="size-3.5 shrink-0" />
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <IconLink
        href="/entrar"
        label="Voltar para o login"
        variant="ghost"
        tooltipSide="right"
      >
        <ArrowLeft className="size-4" />
      </IconLink>
    </div>
  );
}
