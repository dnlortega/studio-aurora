"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck2,
  Check,
  Clock3,
  Loader2,
  Search,
  UserPlus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { adminCreateBookingAction } from "@/actions/admin";
import { IconButton, IconLink } from "@/components/shared/icon-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCurrency,
  formatDayNumeric,
  formatDuration,
  formatMinuteRange,
  minutesToTime,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

type ClientOption = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type ServiceOption = {
  id: string;
  name: string;
  priceCents: number;
  durationMin: number;
};

export function AdminBookingForm({
  clients,
  services,
  maxServices,
  today,
  maxDay,
  defaultDay,
  defaultClientId,
  timezone,
}: {
  clients: ClientOption[];
  services: ServiceOption[];
  maxServices: number;
  today: string;
  maxDay: string;
  defaultDay: string;
  defaultClientId?: string;
  timezone: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [clientQuery, setClientQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [day, setDay] = useState(
    defaultDay >= today && defaultDay <= maxDay ? defaultDay : today,
  );
  const [minute, setMinute] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredClients = useMemo(() => {
    const term = clientQuery.trim().toLowerCase();
    if (!term) return clients.slice(0, 80);
    return clients
      .filter(
        (client) =>
          client.name.toLowerCase().includes(term) ||
          client.email.toLowerCase().includes(term) ||
          (client.phone ?? "").includes(term.replace(/\D/g, "")),
      )
      .slice(0, 80);
  }, [clients, clientQuery]);

  const selectedClient = clients.find((client) => client.id === clientId) ?? null;
  const selectedServices = selectedIds
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is ServiceOption => Boolean(service));
  const totalDuration = selectedServices.reduce(
    (total, service) => total + service.durationMin,
    0,
  );
  const totalPrice = selectedServices.reduce(
    (total, service) => total + service.priceCents,
    0,
  );

  const serviceKey = selectedIds.join(",");

  useEffect(() => {
    setMinute(null);
    if (selectedIds.length === 0 || !day) {
      setSlots([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setSlotsError(null);
    fetch(`/api/disponibilidade?data=${day}&servicos=${serviceKey}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Erro ao consultar.");
        setSlots(data.slots ?? []);
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setSlotsError(error.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [day, serviceKey, selectedIds.length]);

  function toggleService(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= maxServices) {
        toast.error(`Máximo de ${maxServices} serviços por agendamento.`);
        return current;
      }
      return [...current, id];
    });
  }

  function handleSubmit() {
    if (!clientId) {
      toast.error("Selecione a cliente.");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Selecione pelo menos um serviço.");
      return;
    }
    if (minute === null) {
      toast.error("Escolha um horário disponível.");
      return;
    }

    startTransition(async () => {
      const result = await adminCreateBookingAction({
        clientId,
        day,
        startMinute: minute,
        serviceIds: selectedIds,
        notes: notes.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Agendamento criado e confirmado.");
      router.push(`/admin/agendamentos/${result.data?.id}`);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4 text-muted-foreground" />
              Cliente
            </CardTitle>
            <CardDescription>
              Somente clientes ativas aparecem aqui.{" "}
              <Link href="/admin/clientes" className="text-primary hover:underline">
                Gerenciar clientes
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={clientQuery}
                onChange={(event) => setClientQuery(event.target.value)}
                placeholder="Buscar por nome, e-mail ou telefone"
                className="pl-8"
                aria-label="Buscar cliente"
              />
            </div>
            <ScrollArea className="h-44 rounded-lg border border-border/70">
              <div className="space-y-0.5 p-1">
                {filteredClients.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    Nenhuma cliente encontrada. Cadastre uma cliente primeiro.
                  </p>
                ) : (
                  filteredClients.map((client) => {
                    const active = client.id === clientId;
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setClientId(client.id)}
                        aria-pressed={active}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          active
                            ? "bg-secondary font-medium"
                            : "hover:bg-muted/70",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate">{client.name}</span>
                          <span className="block truncate text-[0.68rem] text-muted-foreground">
                            {client.email}
                          </span>
                        </span>
                        {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            {clients.length === 0 ? (
              <IconLink
                href="/admin/clientes"
                label="Cadastrar primeira cliente"
                variant="outline"
                size="icon-sm"
              >
                <UserPlus className="size-4" />
              </IconLink>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Serviços</CardTitle>
            <CardDescription>
              {selectedIds.length}/{maxServices} selecionados · o horário considera a
              duração total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum serviço ativo. Cadastre serviços no catálogo.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {services.map((service) => {
                  const active = selectedIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex items-start justify-between gap-2 rounded-lg border p-2.5 text-left text-sm transition-colors",
                        active
                          ? "border-primary/60 bg-primary/[0.04]"
                          : "border-border/80 hover:border-primary/30",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {service.name}
                        </span>
                        <span className="text-[0.68rem] text-muted-foreground">
                          {formatDuration(service.durationMin)} ·{" "}
                          {formatCurrency(service.priceCents)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {active ? <Check className="size-3" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data e horário</CardTitle>
            <CardDescription>
              Horários já ajustados para a duração total e regras de antecedência.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-48 space-y-1.5">
              <label htmlFor="admin-booking-day" className="text-xs font-medium text-muted-foreground">
                Data
              </label>
              <Input
                id="admin-booking-day"
                type="date"
                min={today}
                max={maxDay}
                value={day}
                onChange={(event) => setDay(event.target.value)}
              />
            </div>

            {selectedIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Selecione os serviços para ver os horários livres.
              </p>
            ) : loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Consultando disponibilidade…
              </div>
            ) : slotsError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {slotsError}
              </p>
            ) : slots.length === 0 ? (
              <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                Sem horários livres nesta data. Tente outro dia ou ajuste os
                serviços.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {slots.length} horário{slots.length === 1 ? "" : "s"}{" "}
                  {slots.length === 1 ? "disponível" : "disponíveis"}
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setMinute(slot)}
                      aria-pressed={minute === slot}
                      className={cn(
                        "h-9 rounded-lg border text-sm tabular-nums transition-colors",
                        minute === slot
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/50",
                      )}
                    >
                      {minutesToTime(slot)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="admin-booking-notes" className="text-xs font-medium text-muted-foreground">
                Observações (opcional)
              </label>
              <Textarea
                id="admin-booking-notes"
                rows={2}
                maxLength={400}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Preferências, alergias, combinados por telefone…"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck2 className="size-4 text-muted-foreground" />
              Resumo
            </CardTitle>
            <CardDescription>Confira antes de confirmar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 text-sm">
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium">
                {selectedClient ? selectedClient.name : "Não selecionada"}
              </p>
              {selectedClient ? (
                <p className="truncate text-xs text-muted-foreground">
                  {selectedClient.email}
                </p>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-1.5 text-sm">
              <p className="text-xs text-muted-foreground">Serviços</p>
              {selectedServices.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum selecionado.</p>
              ) : (
                <ul className="space-y-1">
                  {selectedServices.map((service) => (
                    <li key={service.id} className="flex justify-between gap-2 text-xs">
                      <span className="truncate">{service.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatCurrency(service.priceCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <p className="text-xs text-muted-foreground">Data e horário</p>
              {minute !== null ? (
                <>
                  <p className="font-medium">
                    {formatDayNumeric(day)}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="size-3" />
                    {formatMinuteRange(minute, minute + totalDuration)} ·{" "}
                    {formatDuration(totalDuration)}
                  </p>
                </>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="size-3" />
                  Escolha um horário
                </p>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="font-heading text-xl">{formatCurrency(totalPrice)}</span>
            </div>

            <IconButton
              label="Criar agendamento"
              onClick={handleSubmit}
              disabled={
                pending ||
                !clientId ||
                selectedIds.length === 0 ||
                minute === null
              }
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarCheck2 className="size-4" />
              )}
            </IconButton>
            <p className="text-center text-[0.68rem] text-muted-foreground">
              O agendamento é criado já confirmado pelo admin. Fuso:{" "}
              {timezone.replaceAll("_", " ")}.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
