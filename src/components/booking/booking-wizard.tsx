"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ptBR } from "react-day-picker/locale";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  Info,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  Scissors,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  createBookingAction,
  rescheduleMyAppointmentAction,
} from "@/actions/booking";
import { IconLink, IconButton } from "@/components/shared/icon-button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { renderServiceIcon } from "@/components/shared/service-icon";
import {
  formatCurrency,
  formatDayNumeric,
  formatDuration,
  formatMinuteRange,
  minutesToTime,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

export type WizardService = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  durationMin: number;
};

export type RescheduleInfo = {
  id: string;
  day: string;
  startMinute: number;
  endMinute: number;
  serviceIds: string[];
  serviceNames: string[];
  durationMin: number;
  priceCents: number;
};

type WizardProps = {
  services: WizardService[];
  maxServices: number;
  cancelMinHours: number;
  timezone: string;
  today: string;
  maxDay: string;
  user: { name: string; email: string } | null;
  initialServiceIds: string[];
  reschedule?: RescheduleInfo;
  /**
   * Renderado pelo servidor embaixo do resumo (expediente, endereço,
   * WhatsApp). Server Components atravessam a fronteira como `children` —
   * passá-las por outra prop daria "Functions cannot be passed directly to
   * Client Components".
   */
  children?: ReactNode;
};

type DayInfo = { available: boolean; reason: string };

const DRAFT_KEY = "aurora-booking-draft";
const STEPS = [
  { id: 1, label: "Serviços" },
  { id: 2, label: "Data" },
  { id: 3, label: "Horário" },
  { id: 4, label: "Confirmação" },
] as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isoFromDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromIso(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthOf(iso: string) {
  return iso.slice(0, 7);
}

export function BookingWizard({
  services,
  maxServices,
  cancelMinHours,
  timezone,
  today,
  maxDay,
  user,
  initialServiceIds,
  reschedule,
  children,
}: WizardProps) {
  const router = useRouter();
  const pathname = usePathname();
  /** O login devolve a cliente para a tela em que ela estava. */
  const loginHref = `/entrar?next=${encodeURIComponent(pathname)}`;
  const signupHref = `/criar-conta?next=${encodeURIComponent(pathname)}`;
  const isReschedule = Boolean(reschedule);
  const [step, setStep] = useState(isReschedule ? 2 : 1);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    isReschedule
      ? reschedule?.serviceIds ?? []
      : initialServiceIds.filter((id) => services.some((s) => s.id === id)),
  );
  const [day, setDay] = useState<string | null>(reschedule?.day ?? null);
  const [minute, setMinute] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [month, setMonth] = useState(
    reschedule?.day ? monthOf(reschedule.day) : monthOf(today),
  );
  const [availability, setAvailability] = useState<Record<string, DayInfo>>({});
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [slots, setSlots] = useState<number[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsReason, setSlotsReason] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState<{
    id: string;
    day: string;
    minute: number;
  } | null>(null);
  const [restored, setRestored] = useState(false);
  const slotsLoadedFor = useRef<string | null>(null);

  const selectedServices = useMemo(
    () =>
      selectedIds
        .map((id) => services.find((service) => service.id === id))
        .filter((service): service is WizardService => Boolean(service)),
    [selectedIds, services],
  );

  const totalDuration = isReschedule
    ? reschedule?.durationMin ?? 0
    : selectedServices.reduce((total, service) => total + service.durationMin, 0);
  const totalPrice = isReschedule
    ? reschedule?.priceCents ?? 0
    : selectedServices.reduce((total, service) => total + service.priceCents, 0);

  const serviceKey = selectedIds.join(",");

  // Restaura a seleção após login/criação de conta (sem perder o que foi escolhido).
  useEffect(() => {
    if (isReschedule || restored) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          serviceIds?: string[];
          day?: string | null;
          minute?: number | null;
          notes?: string;
        };
        const validIds = (draft.serviceIds ?? []).filter((id) =>
          services.some((service) => service.id === id),
        );
        if (validIds.length > 0) {
          setSelectedIds(validIds);
          if (draft.notes) setNotes(draft.notes);
          if (draft.day) {
            setDay(draft.day);
            setMonth(monthOf(draft.day));
            if (typeof draft.minute === "number") {
              setMinute(draft.minute);
              setStep(4);
            } else {
              setStep(3);
            }
          }
        }
      }
    } catch {
      // draft inválido: ignora
    }
    setRestored(true);
  }, [isReschedule, restored, services]);

  useEffect(() => {
    if (isReschedule || success) return;
    if (!restored) return;
    if (selectedIds.length === 0) {
      sessionStorage.removeItem(DRAFT_KEY);
      return;
    }
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ serviceIds: selectedIds, day, minute, notes }),
    );
  }, [selectedIds, day, minute, notes, isReschedule, success, restored]);

  useEffect(() => {
    if (success) sessionStorage.removeItem(DRAFT_KEY);
  }, [success]);

  useEffect(() => {
    if (step < 2 || selectedIds.length === 0) return;
    const controller = new AbortController();
    setMonthLoading(true);
    setMonthError(null);
    fetch(
      `/api/disponibilidade?mes=${month}&servicos=${selectedIds.join(",")}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Erro ao consultar");
        setAvailability(data.days ?? {});
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") {
          setMonthError(error.message);
        }
      })
      .finally(() => setMonthLoading(false));
    return () => controller.abort();
  }, [month, serviceKey, step, selectedIds]);

  const loadSlots = useCallback(
    (targetDay: string) => {
      if (selectedIds.length === 0) return;
      const key = `${targetDay}:${selectedIds.join(",")}`;
      slotsLoadedFor.current = key;
      setSlotsLoading(true);
      setSlotsError(null);
      fetch(
        `/api/disponibilidade?data=${targetDay}&servicos=${selectedIds.join(",")}`,
        { cache: "no-store" },
      )
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Erro ao consultar");
          if (slotsLoadedFor.current !== key) return;
          setSlots(data.slots ?? []);
          setSlotsReason(data.reason ?? null);
        })
        .catch((error: Error) => {
          if (slotsLoadedFor.current !== key) return;
          setSlotsError(error.message);
        })
        .finally(() => {
          if (slotsLoadedFor.current === key) setSlotsLoading(false);
        });
    },
    [selectedIds],
  );

  useEffect(() => {
    if (step === 3 && day) loadSlots(day);
  }, [step, day, loadSlots]);

  function toggleService(id: string) {
    if (isReschedule) return;
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      if (current.length >= maxServices) {
        toast.error(`Você pode escolher até ${maxServices} serviços.`);
        return current;
      }
      return [...current, id];
    });
    setMinute(null);
  }

  function goToDate() {
    if (selectedIds.length === 0) {
      toast.error("Escolha pelo menos um serviço.");
      return;
    }
    setStep(2);
  }

  function handleSelectDay(date: Date | undefined) {
    if (!date) return;
    const iso = isoFromDate(date);
    const info = availability[iso];
    if (!info) {
      toast.error("Ainda estamos carregando a agenda deste mês.");
      return;
    }
    if (!info.available) {
      toast.error("Este dia não tem horários disponíveis.");
      return;
    }
    setDay(iso);
    setMinute(null);
    setStep(3);
    loadSlots(iso);
  }

  function handleConfirm() {
    if (!day || minute === null) {
      toast.error("Escolha data e horário.");
      return;
    }
    if (!user) {
      toast.error("Entre para confirmar o agendamento.");
      return;
    }

    startTransition(async () => {
      const result = isReschedule
        ? await rescheduleMyAppointmentAction({
            appointmentId: reschedule!.id,
            day,
            startMinute: minute,
            serviceIds: reschedule!.serviceIds,
          })
        : await createBookingAction({
            day,
            startMinute: minute,
            serviceIds: selectedIds,
            notes,
          });

      if (!result.ok) {
        toast.error(result.message);
        if (
          result.message.toLowerCase().includes("horário") ||
          result.message.toLowerCase().includes("disponível")
        ) {
          setMinute(null);
          setStep(3);
          loadSlots(day);
        }
        return;
      }

      if (result.data) {
        setSuccess({
          id: result.data.id,
          day: result.data.day,
          minute: result.data.startMinute,
        });
        toast.success(
          isReschedule
            ? "Agendamento atualizado."
            : "Agendamento confirmado!",
        );
        router.refresh();
      }
    });
  }

  function resetWizard() {
    setSuccess(null);
    setStep(isReschedule ? 2 : 1);
    setMinute(null);
    setNotes("");
    if (isReschedule) {
      setDay(reschedule!.day);
    } else {
      setSelectedIds([]);
      setDay(null);
    }
  }

  if (success) {
    return (
      <SuccessPanel
        serviceNames={
          isReschedule
            ? reschedule!.serviceNames
            : selectedServices.map((service) => service.name)
        }
        isReschedule={isReschedule}
        onReset={resetWizard}
        day={success.day}
        minute={success.minute}
        durationMin={totalDuration}
        priceCents={totalPrice}
        appointmentId={isReschedule ? reschedule!.id : success.id}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <div className="min-w-0 space-y-7">
        <Stepper current={step} />

        {step === 1 ? (
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-medium">Quais serviços você deseja?</h2>
              <span className="text-xs text-muted-foreground">
                {selectedIds.length}/{maxServices} selecionados
              </span>
            </div>

            {isReschedule ? (
              <Card className="border-primary/20 bg-accent/20">
                <CardContent className="flex flex-wrap gap-2 p-4">
                  {reschedule!.serviceNames.map((name) => (
                    <Badge key={name} variant="outline" className="gap-1 bg-background">
                      <Scissors className="size-3" />
                      {name}
                    </Badge>
                  ))}
                  <p className="w-full text-xs text-muted-foreground">
                    Os serviços não podem ser alterados por aqui. Fale com o
                    salão se precisar mudar a composição do atendimento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((service) => {
                  const selected = selectedIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      aria-pressed={selected}
                      className={cn(
                        "group relative flex h-full flex-col rounded-xl border p-4 text-left transition-all",
                        selected
                          ? "border-primary/60 bg-primary/[0.04] shadow-sm ring-1 ring-primary/20"
                          : "border-border/80 bg-card hover:border-primary/30 hover:shadow-sm",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-full border transition-colors",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-secondary text-muted-foreground",
                          )}
                        >
                          {selected ? (
                            <Check className="size-4" />
                          ) : (
                            renderServiceIcon(service.name, "size-4")
                          )}
                        </span>
                        <span className="font-heading text-lg">
                          {formatCurrency(service.priceCents)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium">{service.name}</p>
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {service.description ??
                          "Cuidado com as suas unhas, do começo ao fim."}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 text-[0.68rem] uppercase tracking-wider text-muted-foreground">
                        <Clock3 className="size-3" />
                        {formatDuration(service.durationMin)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <IconLink
                href={isReschedule ? `/painel/agendamentos/${reschedule!.id}` : "/servicos"}
                label={isReschedule ? "Voltar aos detalhes" : "Ver catálogo"}
                variant="ghost"
                tooltipSide="bottom"
              >
                <ArrowLeft className="size-4" />
              </IconLink>
              <IconButton
                label={isReschedule ? "Escolher nova data" : "Escolher data"}
                onClick={isReschedule ? () => setStep(2) : goToDate}
                tooltipSide="bottom"
              >
                <CalendarDays className="size-4" />
              </IconButton>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium">Escolha o dia</h2>
                <p className="text-xs text-muted-foreground">
                  Dias indisponíveis consideram expediente, bloqueios e a duração
                  total dos serviços.
                </p>
              </div>
              {monthLoading ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Atualizando agenda
                </span>
              ) : null}
            </div>

            <Card className="border-border/80 bg-card">
              <CardContent className="flex justify-center p-3 sm:p-4">
                <Calendar
                  mode="single"
                  locale={ptBR}
                  selected={day ? dateFromIso(day) : undefined}
                  onSelect={handleSelectDay}
                  month={dateFromIso(`${month}-01`)}
                  onMonthChange={(date) => setMonth(monthOf(isoFromDate(date)))}
                  startMonth={dateFromIso(`${monthOf(today)}-01`)}
                  endMonth={dateFromIso(maxDay)}
                  disabled={(date) => {
                    const iso = isoFromDate(date);
                    if (iso < today || iso > maxDay) return true;
                    return !availability[iso]?.available;
                  }}
                  showOutsideDays={false}
                  className="w-full [--cell-size:--spacing(10)] sm:[--cell-size:--spacing(11)]"
                />
              </CardContent>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 px-4 py-3 text-[0.7rem] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" />
                  Disponível
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-muted-foreground/30" />
                  Indisponível
                </span>
                <span className="ml-auto">
                  Fuso do salão: {timezone.replaceAll("_", " ")}
                </span>
              </div>
            </Card>

            {monthError ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {monthError}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <IconButton
                variant="ghost"
                label={isReschedule ? "Serviços" : "Alterar serviços"}
                onClick={() => setStep(1)}
                tooltipSide="bottom"
              >
                <ArrowLeft className="size-4" />
              </IconButton>
              {day ? (
                <p className="text-xs text-muted-foreground">
                  Selecionado:{" "}
                  <span className="font-medium text-foreground">
                    {formatDayNumeric(day)}
                  </span>
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium">Horários disponíveis</h2>
                <p className="text-xs text-muted-foreground">
                  {day ? formatDayNumeric(day) : ""} · atendimento de{" "}
                  {formatDuration(totalDuration)}
                </p>
              </div>
              <IconButton
                variant="outline"
                size="icon-sm"
                label="Trocar data"
                onClick={() => setStep(2)}
                tooltipSide="left"
              >
                <CalendarDays className="size-3.5" />
              </IconButton>
            </div>

            {slotsLoading ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-11 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : slotsError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {slotsError}
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-secondary text-muted-foreground">
                  <CalendarX2 className="size-5" />
                </span>
                <div>
                  <p className="font-medium">Sem horários neste dia</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {slotsReason ??
                      "Tente outra data ou ajuste a seleção de serviços."}
                  </p>
                </div>
                <IconButton
                  variant="outline"
                  size="icon-sm"
                  label="Ver outros dias"
                  onClick={() => setStep(2)}
                >
                  <CalendarDays className="size-3.5" />
                </IconButton>
              </div>
            ) : (
              <SlotGroups
                slots={slots}
                onSelect={(value) => {
                  setMinute(value);
                  setStep(4);
                }}
              />
            )}

            {!slotsLoading && slots.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Horários exibidos já reservam o tempo total de{" "}
                {formatDuration(totalDuration)} para os serviços escolhidos.
              </p>
            ) : null}

            <div className="pt-1">
              <IconButton
                variant="ghost"
                label="Voltar ao calendário"
                onClick={() => setStep(2)}
                tooltipSide="bottom"
              >
                <ArrowLeft className="size-4" />
              </IconButton>
            </div>
          </section>
        ) : null}

        {step === 4 && day && minute !== null ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-medium">Confirme os detalhes</h2>
              <p className="text-xs text-muted-foreground">
                Revise as informações antes de reservar. O horário só é
                garantido após a confirmação.
              </p>
            </div>

            <Card className="border-border/80">
              <CardContent className="space-y-5 p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <CalendarCheck2 className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {formatDayNumeric(day)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatMinuteRange(minute, minute + totalDuration)} ·{" "}
                      {formatDuration(totalDuration)}
                    </p>
                  </div>
                  <IconButton
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto"
                    label="Alterar"
                    onClick={() => setStep(3)}
                    tooltipSide="left"
                  >
                    <Pencil className="size-3" />
                  </IconButton>
                </div>

                <Separator />

                <ul className="space-y-2.5">
                  {isReschedule
                    ? reschedule!.serviceNames.map((name) => (
                        <li
                          key={name}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <Scissors className="size-3.5 text-muted-foreground" />
                            {name}
                          </span>
                        </li>
                      ))
                    : selectedServices.map((service) => (
                        <li
                          key={service.id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Scissors className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{service.name}</span>
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatCurrency(service.priceCents)}
                          </span>
                        </li>
                      ))}
                </ul>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total estimado</span>
                  <span className="font-heading text-2xl">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>

                {!isReschedule ? (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="notes"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Alguma observação? (opcional)
                    </label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      maxLength={400}
                      placeholder="Referências, alergias, preferências…"
                    />
                  </div>
                ) : null}

                <div className="rounded-lg bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
                  <Info className="mr-1 inline size-3.5 align-[-2px]" />
                  Cancelamentos e alterações pelo site são permitidos até{" "}
                  {cancelMinHours}h antes do horário. Depois disso, fale
                  diretamente com o salão.
                </div>

                {user ? (
                  <div className="flex flex-col items-center gap-2">
                    <IconButton
                      label={
                        pending
                          ? "Confirmando…"
                          : isReschedule
                            ? "Confirmar novo horário"
                            : "Confirmar agendamento"
                      }
                      onClick={handleConfirm}
                      disabled={pending}
                      aria-busy={pending || undefined}
                    >
                      {pending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                    </IconButton>
                    <p className="text-center text-[0.7rem] text-muted-foreground">
                      Reserva em nome de {user.name} · {user.email}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-primary/20 bg-accent/30 p-4">
                    <p className="text-sm font-medium">
                      Entre para concluir sua reserva
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sua seleção fica guardada. Você volta exatamente para esta
                      etapa depois do login.
                    </p>
                    <div className="flex gap-2">
                      <IconLink href={loginHref} label="Entrar">
                        <LogIn className="size-4" />
                      </IconLink>
                      <IconLink
                        href={signupHref}
                        label="Criar conta"
                        variant="outline"
                      >
                        <UserPlus className="size-4" />
                      </IconLink>
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <IconButton
                    variant="ghost"
                    label="Escolher outro horário"
                    onClick={() => setStep(3)}
                  >
                    <ArrowLeft className="size-4" />
                  </IconButton>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Resumo</CardTitle>
            <CardDescription className="text-xs">
              {isReschedule
                ? "Reagendamento do seu atendimento"
                : "Atualize conforme suas escolhas"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {selectedServices.length === 0 && !isReschedule ? (
              <p className="text-xs text-muted-foreground">
                Nenhum serviço selecionado ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {(isReschedule
                  ? reschedule!.serviceNames.map((name, index) => ({
                      id: `${name}-${index}`,
                      name,
                      priceCents: null as number | null,
                    }))
                  : selectedServices.map((service) => ({
                      id: service.id,
                      name: service.name,
                      priceCents: service.priceCents,
                    }))
                ).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2 text-xs"
                  >
                    <span className="flex min-w-0 items-start gap-1.5">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                      <span className="truncate text-muted-foreground">{item.name}</span>
                    </span>
                    {item.priceCents !== null ? (
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatCurrency(item.priceCents)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {day && minute !== null ? (
              <div className="rounded-lg bg-secondary/50 p-3 text-xs">
                <p className="font-medium">{formatDayNumeric(day)}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {minutesToTime(minute)} · {formatDuration(totalDuration)}
                </p>
              </div>
            ) : null}

            <Separator />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Duração total</span>
              <span className="tabular-nums">{formatDuration(totalDuration)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="font-heading text-xl">{formatCurrency(totalPrice)}</span>
            </div>

            {!isReschedule && selectedIds.length > 0 ? (
              <div className="flex justify-end">
                <IconButton
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  label="Limpar seleção"
                  tooltipSide="left"
                  onClick={() => {
                    setSelectedIds([]);
                    setDay(null);
                    setMinute(null);
                    setNotes("");
                    setStep(1);
                  }}
                >
                  <X className="size-3.5" />
                </IconButton>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {children}
      </aside>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="Etapas">
      {STEPS.map((step, index) => {
        const done = current > step.id;
        const active = current === step.id;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-1.5 sm:gap-2">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border text-[0.7rem] font-medium transition-colors",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary text-primary",
                !done && !active && "border-border text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="size-3.5" /> : step.id}
            </span>
            <span
              className={cn(
                "hidden text-xs sm:inline",
                active ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <span
                className={cn(
                  "h-px flex-1",
                  current > step.id ? "bg-primary/50" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function SlotGroups({
  slots,
  onSelect,
}: {
  slots: number[];
  onSelect: (minute: number) => void;
}) {
  const groups = [
    { label: "Manhã", icon: Sparkles, items: slots.filter((slot) => slot < 720) },
    {
      label: "Tarde",
      icon: CalendarDays,
      items: slots.filter((slot) => slot >= 720 && slot < 1080),
    },
    { label: "Noite", icon: Clock3, items: slots.filter((slot) => slot >= 1080) },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {group.label}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {group.items.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onSelect(slot)}
                className="flex h-11 items-center justify-center rounded-lg border border-border bg-card text-sm tabular-nums transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {minutesToTime(slot)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SuccessPanel({
  serviceNames,
  isReschedule,
  onReset,
  day,
  minute,
  durationMin,
  priceCents,
  appointmentId,
}: {
  serviceNames: string[];
  isReschedule: boolean;
  onReset: () => void;
  day: string;
  minute: number;
  durationMin: number;
  priceCents: number;
  appointmentId: string;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-6 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-medium">
          {isReschedule ? "Horário atualizado" : "Horário reservado"}
        </h1>
        <p className="text-sm text-muted-foreground text-pretty">
          {isReschedule
            ? "Seu agendamento foi remarcado. O salão já está com a nova agenda."
            : "Seu agendamento está confirmado. Você pode acompanhar, remarcar ou cancelar pelo seu painel."}
        </p>
      </div>

      <Card className="text-left">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">{formatDayNumeric(day)}</p>
              <p className="text-sm text-muted-foreground">
                {formatMinuteRange(minute, minute + durationMin)} ·{" "}
                {formatDuration(durationMin)}
              </p>
            </div>
          </div>
          <Separator />
          <ul className="flex flex-wrap gap-1.5">
            {serviceNames.map((name) => (
              <li key={name}>
                <Badge variant="secondary" className="font-normal">
                  {name}
                </Badge>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border/70 pt-3">
            <span className="text-xs text-muted-foreground">Total estimado</span>
            <span className="font-heading text-xl">{formatCurrency(priceCents)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2">
        <IconLink
          href={`/painel/agendamentos/${appointmentId}`}
          label="Ver agendamento"
        >
          <Eye className="size-4" />
        </IconLink>
        <IconButton
          variant="outline"
          label={isReschedule ? "Reagendar novamente" : "Fazer outro agendamento"}
          onClick={onReset}
        >
          {isReschedule ? (
            <CalendarClock className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
        </IconButton>
      </div>
      <p className="text-xs text-muted-foreground">
        Dica: adicione o Studio Aurora à tela inicial para acessar sua agenda
        mais rápido.
      </p>
    </div>
  );
}
