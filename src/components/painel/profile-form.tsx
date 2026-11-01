"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save } from "lucide-react";
import type { z } from "zod";

import {
  updateProfileAction,
  updateProfileFormAction,
} from "@/actions/booking";
import { SwitchField } from "@/components/forms/switch-field";
import { TextField } from "@/components/forms/text-field";
import { IconSubmitButton } from "@/components/shared/icon-button";
import { formatPhoneInput } from "@/lib/dates";
import { updateProfileSchema } from "@/lib/validation/schemas";

type ProfileInput = z.input<typeof updateProfileSchema>;
type ProfileValues = z.output<typeof updateProfileSchema>;

export function ProfileForm({
  defaults,
}: {
  defaults: {
    name: string;
    phone: string;
    notifyEmail: boolean;
    notifyWhatsapp: boolean;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ProfileInput, unknown, ProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: defaults,
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (!result.ok) {
        toast.error(result.message);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof ProfileInput, { message });
          }
        }
        return;
      }
      toast.success("Dados atualizados.");
      router.refresh();
    });
  });

  return (
    <form
      action={updateProfileFormAction}
      onSubmit={onSubmit}
      className="space-y-5"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          control={form.control}
          name="name"
          label="Nome completo"
          autoComplete="name"
          className="sm:col-span-2"
        />
        <TextField
          control={form.control}
          name="phone"
          label="Telefone / WhatsApp"
          type="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          format={formatPhoneInput}
          description="Usado pelo salão para contato sobre o seu atendimento."
        />
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 bg-secondary/30 p-4">
        <p className="text-sm font-medium">Preferências de notificação</p>
        <SwitchField
          control={form.control}
          name="notifyEmail"
          label="Avisos por e-mail"
          description="Confirmações, lembretes e alterações de horário."
        />
        <SwitchField
          control={form.control}
          name="notifyWhatsapp"
          label="Avisos por WhatsApp"
          description="Disponível quando o salão configurar o canal de WhatsApp."
        />
      </div>

      <IconSubmitButton
        label="Salvar alterações"
        pending={pending}
        icon={<Save className="size-4" />}
      />
    </form>
  );
}
