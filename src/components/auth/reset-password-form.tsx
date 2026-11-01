"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import {
  resetPasswordAction,
  resetPasswordFormAction,
} from "@/actions/auth";
import { TextField } from "@/components/forms/text-field";
import {
  IconSubmitButton,
} from "@/components/shared/icon-button";
import { KeyRound } from "lucide-react";
import { resetPasswordSchema } from "@/lib/validation/schemas";

type ResetValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await resetPasswordAction(values);
      if (!result.ok) {
        toast.error(result.message);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof ResetValues, { message });
          }
        }
      }
    });
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="eyebrow">Nova senha</p>
        <h1 className="text-3xl font-medium">Criar uma nova senha</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Escolha uma senha forte. Por segurança, todos os dispositivos serão
          desconectados após a alteração.
        </p>
      </div>

      <form
        action={resetPasswordFormAction}
        onSubmit={onSubmit}
        className="space-y-4"
        noValidate
      >
        <input type="hidden" name="token" value={token} />
        <TextField
          control={form.control}
          name="password"
          label="Nova senha"
          type="password"
          placeholder="Mínimo de 8 caracteres"
          autoComplete="new-password"
          description="Use letras e números."
        />
        <TextField
          control={form.control}
          name="confirmPassword"
          label="Confirmar nova senha"
          type="password"
          placeholder="Repita a senha"
          autoComplete="new-password"
        />
        <IconSubmitButton
          label="Redefinir senha"
          pending={pending}
          size="icon-lg"
          icon={<KeyRound className="size-4" />}
        />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/entrar"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
