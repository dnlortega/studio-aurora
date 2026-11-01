"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { signupAction, signupFormAction } from "@/actions/auth";
import { TextField } from "@/components/forms/text-field";
import {
  IconSubmitButton,
} from "@/components/shared/icon-button";
import { UserPlus } from "lucide-react";
import { signupSchema } from "@/lib/validation/schemas";

type SignupInput = z.input<typeof signupSchema>;
type SignupValues = z.output<typeof signupSchema>;

export function SignupForm({ next }: { next?: string }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<SignupInput, unknown, SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      next,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await signupAction(values);
      if (!result.ok) {
        toast.error(result.message);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof SignupValues, { message });
          }
        }
      }
    });
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="eyebrow">Nova conta</p>
        <h1 className="text-3xl font-medium">Vamos nos conhecer</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Crie sua conta para agendar, acompanhar e cuidar dos seus horários em
          um só lugar.
        </p>
      </div>

      <form
        action={signupFormAction}
        onSubmit={onSubmit}
        className="space-y-4"
        noValidate
      >
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <TextField
          control={form.control}
          name="name"
          label="Nome completo"
          placeholder="Como podemos te chamar?"
          autoComplete="name"
        />
        <TextField
          control={form.control}
          name="email"
          label="E-mail"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
        />
        <TextField
          control={form.control}
          name="phone"
          label="Telefone (opcional)"
          placeholder="(11) 99999-0000"
          autoComplete="tel"
          description="Usamos apenas para avisos sobre o seu horário."
        />
        <TextField
          control={form.control}
          name="password"
          label="Senha"
          type="password"
          placeholder="Mínimo de 8 caracteres"
          autoComplete="new-password"
          description="Use pelo menos 8 caracteres, com letras e números."
        />
        <TextField
          control={form.control}
          name="confirmPassword"
          label="Confirmar senha"
          type="password"
          placeholder="Repita a senha"
          autoComplete="new-password"
        />

        <IconSubmitButton
          label="Criar conta"
          pending={pending}
          size="icon-lg"
          icon={<UserPlus className="size-4" />}
        />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link
          href={next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
