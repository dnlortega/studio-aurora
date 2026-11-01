"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info, Save } from "lucide-react";
import { toast } from "sonner";

import { updateSettingsAction } from "@/actions/admin";
import { IconSubmitButton } from "@/components/shared/icon-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type SettingsFormValues = {
  salonName: string;
  tagline: string;
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  timezone: string;
  slotGranularityMin: string;
  minLeadMinutes: string;
  maxLeadDays: string;
  cancelMinHours: string;
  rescheduleMinHours: string;
  maxServicesPerBooking: string;
  autoConfirm: boolean;
  publicNotice: string;
};

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Cuiaba",
  "America/Rio_Branco",
  "America/Noronha",
];

function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  min,
  max,
  error,
  suffix,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  error?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          className={suffix ? "pr-14" : undefined}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">{hint}</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function SettingsForm({
  initial,
}: {
  initial: SettingsFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<SettingsFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof SettingsFormValues>(
    key: K,
    value: SettingsFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const result = await updateSettingsAction({
        ...values,
        slotGranularityMin: Number(values.slotGranularityMin),
        minLeadMinutes: Number(values.minLeadMinutes),
        maxLeadDays: Number(values.maxLeadDays),
        cancelMinHours: Number(values.cancelMinHours),
        rescheduleMinHours: Number(values.rescheduleMinHours),
        maxServicesPerBooking: Number(values.maxServicesPerBooking),
      });

      if (!result.ok) {
        setFormError(result.message);
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {formError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Identidade do salão</CardTitle>
          <CardDescription>
            Nome e textos exibidos no site público e nos e-mails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="salonName">Nome do salão</Label>
              <Input
                id="salonName"
                value={values.salonName}
                maxLength={80}
                onChange={(event) => update("salonName", event.target.value)}
                aria-invalid={Boolean(errors.salonName)}
              />
              {errors.salonName ? (
                <p className="text-xs text-destructive">{errors.salonName}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tagline">Frase de destaque</Label>
              <Input
                id="tagline"
                value={values.tagline}
                maxLength={120}
                onChange={(event) => update("tagline", event.target.value)}
                aria-invalid={Boolean(errors.tagline)}
              />
              {errors.tagline ? (
                <p className="text-xs text-destructive">{errors.tagline}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              rows={3}
              maxLength={800}
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Conte em poucas linhas o que torna o salão especial."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="publicNotice">Aviso no site</Label>
            <Textarea
              id="publicNotice"
              rows={2}
              maxLength={300}
              value={values.publicNotice}
              onChange={(event) => update("publicNotice", event.target.value)}
              placeholder="Ex.: atendimento apenas com agendamento prévio."
            />
            <p className="text-[0.7rem] text-muted-foreground">
              Aparece como um aviso discreto na página inicial. Deixe vazio para
              ocultar.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato e localização</CardTitle>
          <CardDescription>
            Canais divulgados no site, nos comprovantes e nas notificações.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={values.phone}
              maxLength={30}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="(11) 4000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={values.whatsapp}
              maxLength={30}
              onChange={(event) => update("whatsapp", event.target.value)}
              placeholder="(11) 90000-0000"
            />
            <p className="text-[0.7rem] text-muted-foreground">
              Apenas contato. O envio automático por WhatsApp não está integrado.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail de contato</Label>
            <Input
              id="email"
              type="email"
              value={values.email}
              maxLength={120}
              onChange={(event) => update("email", event.target.value)}
              placeholder="contato@studioaurora.com.br"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={values.instagram}
              maxLength={80}
              onChange={(event) => update("instagram", event.target.value)}
              placeholder="@studioaurora"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={values.address}
              maxLength={200}
              onChange={(event) => update("address", event.target.value)}
              placeholder="Rua, número, bairro, cidade"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras de operação</CardTitle>
          <CardDescription>
            Valem para o site, para o painel e para as validações do servidor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="timezone">Fuso horário do salão</Label>
              <Input
                id="timezone"
                value={values.timezone}
                onChange={(event) => update("timezone", event.target.value)}
                list="salon-timezones"
                spellCheck={false}
                aria-invalid={Boolean(errors.timezone)}
              />
              <datalist id="salon-timezones">
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
              <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                Identificador IANA, como America/Sao_Paulo. Datas e horários de
                agendamento são sempre interpretados neste fuso.
              </p>
              {errors.timezone ? (
                <p className="text-xs text-destructive">{errors.timezone}</p>
              ) : null}
            </div>

            <NumberField
              id="slotGranularityMin"
              label="Intervalo entre horários"
              hint="Passo da grade de horários oferecida no site."
              suffix="min"
              min={5}
              max={120}
              value={values.slotGranularityMin}
              onChange={(value) => update("slotGranularityMin", value)}
              error={errors.slotGranularityMin}
            />
            <NumberField
              id="minLeadMinutes"
              label="Antecedência mínima"
              hint="Tempo mínimo entre a confirmação e o atendimento."
              suffix="min"
              min={0}
              max={20160}
              value={values.minLeadMinutes}
              onChange={(value) => update("minLeadMinutes", value)}
              error={errors.minLeadMinutes}
            />
            <NumberField
              id="maxLeadDays"
              label="Janela de agendamento"
              hint="Quantos dias à frente a agenda fica aberta."
              suffix="dias"
              min={1}
              max={365}
              value={values.maxLeadDays}
              onChange={(value) => update("maxLeadDays", value)}
              error={errors.maxLeadDays}
            />
            <NumberField
              id="maxServicesPerBooking"
              label="Serviços por agendamento"
              hint="Limite de serviços combinados no mesmo atendimento."
              min={1}
              max={6}
              value={values.maxServicesPerBooking}
              onChange={(value) => update("maxServicesPerBooking", value)}
              error={errors.maxServicesPerBooking}
            />
            <NumberField
              id="cancelMinHours"
              label="Cancelamento pelo site"
              hint="Prazo mínimo antes do atendimento. O admin pode cancelar a qualquer momento."
              suffix="h"
              min={0}
              max={720}
              value={values.cancelMinHours}
              onChange={(value) => update("cancelMinHours", value)}
              error={errors.cancelMinHours}
            />
            <NumberField
              id="rescheduleMinHours"
              label="Reagendamento pelo site"
              hint="Prazo mínimo antes do atendimento para o cliente remarcar."
              suffix="h"
              min={0}
              max={720}
              value={values.rescheduleMinHours}
              onChange={(value) => update("rescheduleMinHours", value)}
              error={errors.rescheduleMinHours}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="autoConfirm" className="text-sm font-medium">
                Confirmar automaticamente
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Quando ativo, novos agendamentos entram como confirmados. Quando
                desativado, ficam pendentes até a equipe aprovar.
              </p>
            </div>
            <Switch
              id="autoConfirm"
              checked={values.autoConfirm}
              onCheckedChange={(checked) => update("autoConfirm", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Alterações nas regras valem para novos agendamentos. Atendimentos já
          criados mantêm seus horários e valores.
        </p>
        <IconSubmitButton
          label="Salvar configurações"
          pending={pending}
          icon={<Save className="size-4" />}
          tooltipSide="left"
        />
      </div>
    </form>
  );
}
