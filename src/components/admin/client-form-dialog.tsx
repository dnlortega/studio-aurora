"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, UserPlus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import {
  createClientAction,
  updateClientAction,
} from "@/actions/admin";
import { SwitchField } from "@/components/forms/switch-field";
import { TextField } from "@/components/forms/text-field";
import { IconSubmitButton } from "@/components/shared/icon-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { adminClientSchema } from "@/lib/validation/schemas";
import { formatPhoneInput } from "@/lib/dates";

type ClientInput = z.input<typeof adminClientSchema>;
type ClientValues = z.output<typeof adminClientSchema>;

export type EditableClient = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
};

export function ClientFormDialog({
  trigger,
  client,
}: {
  trigger: React.ReactElement;
  client?: EditableClient;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(client);

  const defaults: ClientInput = {
    id: client?.id,
    name: client?.name ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    password: "",
    isActive: client?.isActive ?? true,
  };

  const form = useForm<ClientInput, unknown, ClientValues>({
    resolver: zodResolver(adminClientSchema),
    defaultValues: defaults,
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(defaults);
  }

  function onSubmit(values: ClientValues) {
    startTransition(async () => {
      const result = editing
        ? await updateClientAction(values)
        : await createClientAction(values);

      if (!result.ok) {
        toast.error(result.message);
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(field as keyof ClientInput, { message });
        }
        return;
      }

      toast.success(result.message);
      setOpen(false);
      form.reset(defaults);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar cliente" : "Nova cliente"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Atualize os dados de contato e o acesso da cliente. Alterar a senha encerra as sessões abertas."
              : "A conta é criada com perfil de cliente e pode entrar imediatamente com a senha informada."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup className="gap-3">
            <TextField
              control={form.control}
              name="name"
              label="Nome completo"
              placeholder="Mariana Costa"
              autoComplete="off"
            />
            <TextField
              control={form.control}
              name="email"
              label="E-mail"
              type="email"
              placeholder="cliente@email.com"
              autoComplete="off"
            />
            <TextField
              control={form.control}
              name="phone"
              label="Telefone"
              placeholder="(11) 99999-0000"
              format={formatPhoneInput}
              autoComplete="off"
            />
            <TextField
              control={form.control}
              name="password"
              label={editing ? "Nova senha (opcional)" : "Senha inicial"}
              type="password"
              placeholder={editing ? "Deixe vazio para manter" : "Mínimo 8 caracteres"}
              description="Mínimo de 8 caracteres, incluindo letra e número."
              autoComplete="new-password"
            />
            <SwitchField
              control={form.control}
              name="isActive"
              label="Conta ativa"
              description="Contas inativas não conseguem entrar nem aparecem para novos agendamentos."
            />
          </FieldGroup>

          <DialogFooter>
            <DialogClose
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Cancelar"
                  title="Cancelar"
                  disabled={pending}
                >
                  <X className="size-4" />
                </Button>
              }
            />
            <IconSubmitButton
              label={editing ? "Salvar alterações" : "Cadastrar cliente"}
              pending={pending}
              icon={
                editing ? <Save className="size-4" /> : <UserPlus className="size-4" />
              }
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
