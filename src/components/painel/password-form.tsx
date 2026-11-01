"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import type { z } from "zod";

import {
  updatePasswordAction,
  updatePasswordFormAction,
} from "@/actions/booking";
import { TextField } from "@/components/forms/text-field";
import { IconSubmitButton } from "@/components/shared/icon-button";
import { changePasswordSchema } from "@/lib/validation/schemas";

type PasswordValues = z.infer<typeof changePasswordSchema>;

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const form = useForm<PasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updatePasswordAction(values);
      if (!result.ok) {
        toast.error(result.message);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof PasswordValues, { message });
          }
        }
        return;
      }
      toast.success("Senha alterada. Suas outras sessões foram encerradas.");
      form.reset();
    });
  });

  return (
    <form
      action={updatePasswordFormAction}
      onSubmit={onSubmit}
      className="space-y-4"
      noValidate
    >
      <TextField
        control={form.control}
        name="currentPassword"
        label="Senha atual"
        type="password"
        autoComplete="current-password"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          control={form.control}
          name="password"
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          description="Mínimo de 8 caracteres, com letras e números."
        />
        <TextField
          control={form.control}
          name="confirmPassword"
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
        />
      </div>
      <IconSubmitButton
        label="Alterar senha"
        variant="outline"
        pending={pending}
        icon={<KeyRound className="size-4" />}
      />
    </form>
  );
}
