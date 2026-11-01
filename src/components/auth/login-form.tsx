"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { loginAction, loginFormAction } from "@/actions/auth";
import { TextField } from "@/components/forms/text-field";
import {
  IconLink,
  IconSubmitButton,
} from "@/components/shared/icon-button";
import { loginSchema } from "@/lib/validation/schemas";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ next }: { next?: string }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", next },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await loginAction(values);
      if (!result.ok) {
        toast.error(result.message);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof LoginValues, { message });
          }
        }
      }
    });
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="eyebrow">Área da cliente</p>
        <h1 className="text-3xl font-medium">Bem-vinda de volta</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Entre para acompanhar seus horários, remarcar e cancelar com
          tranquilidade.
        </p>
      </div>

      <form
        action={loginFormAction}
        onSubmit={onSubmit}
        className="space-y-4"
        noValidate
      >
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <TextField
          control={form.control}
          name="email"
          label="E-mail"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
        />
        <div className="space-y-1.5">
          <TextField
            control={form.control}
            name="password"
            label="Senha"
            type="password"
            placeholder="Sua senha"
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              href="/recuperar-senha"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <IconSubmitButton
          label="Entrar"
          pending={pending}
          size="icon-lg"
          icon={<LogIn className="size-4" />}
        />
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground">
            Primeira vez por aqui?
          </span>
        </div>
      </div>

      <IconLink
        href={next ? `/criar-conta?next=${encodeURIComponent(next)}` : "/criar-conta"}
        label="Criar minha conta"
        variant="outline"
        size="icon-lg"
      >
        <UserPlus className="size-4" />
      </IconLink>

      <p className="text-center text-xs text-muted-foreground">
        Ao entrar, você concorda com o uso dos seus dados apenas para
        gerenciamento dos seus agendamentos.
      </p>
    </div>
  );
}
