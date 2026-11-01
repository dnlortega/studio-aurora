import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  CheckCircle2,
  Clock3,
  CreditCard,
  Info,
  MapPin,
  MessageSquare,
  Phone,
  Scissors,
  Timer,
} from "lucide-react";

import { AppointmentActions } from "@/components/painel/appointment-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { IconLink } from "@/components/shared/icon-button";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/lib/auth/guards";
import { getClientAppointmentDetail } from "@/lib/booking/queries";
import { getActiveServices, STATUS_LABELS } from "@/lib/booking/service";
import {
  daysBetween,
  formatCurrency,
  formatDuration,
  formatFullDate,
  formatMinuteRange,
  getSalonNow,
} from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Detalhes do agendamento" };

function historyLabel(action: string) {
  if (action === "created") return "Agendamento criado";
  if (action === "rescheduled") return "Horário alterado";
  if (action === "cancelled") return "Agendamento cancelado";
  if (action === "payment") return "Pagamento atualizado";
  if (action.startsWith("status:")) {
    const status = action.slice(7) as Appointment["status"];
    return `Status: ${STATUS_LABELS[status] ?? status}`;
  }
  return action;
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, settings] = await Promise.all([
    requireUser(`/painel/agendamentos/${id}`),
    getSettings(),
  ]);

  const appointment = await getClientAppointmentDetail(id, user.id);

  if (!appointment) {
    return (
      <div className="space-y-6">
        <Link
          href="/painel/agendamentos"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Meus agendamentos
        </Link>
        <EmptyState
          icon={CalendarX2}
          title="Agendamento não encontrado"
          description="Este agendamento não existe ou não está vinculado à sua conta. Por segurança, não exibimos reservas de outras pessoas."
          action={
            <IconLink
              href="/painel/agendamentos"
              label="Voltar aos meus agendamentos"
            >
              <ArrowLeft className="size-4" />
            </IconLink>
          }
        />
      </div>
    );
  }

  const now = getSalonNow(settings.timezone);
  const leadMinutes =
    daysBetween(now.day, appointment.startsOn) * 24 * 60 +
    appointment.startMinute -
    now.minute;
  const isActive =
    appointment.status === "pending" || appointment.status === "confirmed";
  const isFuture = leadMinutes > 0;
  const canCancel =
    isActive && isFuture && leadMinutes >= settings.cancelMinHours * 60;
  const canReschedule =
    isActive && isFuture && leadMinutes >= settings.rescheduleMinHours * 60;

  const activeServices = await getActiveServices();
  const rebookSlugs = appointment.items
    .map((item) => activeServices.find((service) => service.id === item.serviceId)?.slug)
    .filter((slug): slug is string => Boolean(slug));
  const rebookHref =
    rebookSlugs.length > 0 ? `/agendar?servico=${rebookSlugs.join(",")}` : "/agendar";

  const dateTime = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: settings.timezone,
  });

  const paid = appointment.paymentStatus === "paid";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/painel/agendamentos"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Meus agendamentos
        </Link>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="space-y-1.5">
        <p className="eyebrow">Detalhes do atendimento</p>
        <h1 className="text-2xl font-medium first-letter:uppercase tracking-tight sm:text-3xl">
          {formatFullDate(appointment.startsOn)}
        </h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Clock3 className="size-3.5" />
            {formatMinuteRange(appointment.startMinute, appointment.endMinute)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Timer className="size-3.5" />
            {formatDuration(appointment.totalDurationMin)}
          </span>
          <span className="font-medium text-foreground">
            {formatCurrency(appointment.totalPriceCents)}
          </span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                Serviços do atendimento
              </CardTitle>
              <CardDescription className="text-xs">
                Valores registrados no momento da reserva.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointment.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <Scissors className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.serviceName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(item.durationMin)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums">
                    {formatCurrency(item.priceCents)}
                  </span>
                </div>
              ))}

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-heading text-xl">
                  {formatCurrency(appointment.totalPriceCents)}
                </span>
              </div>
            </CardContent>
          </Card>

          {appointment.notes ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  Sua observação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {appointment.notes}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                Histórico da reserva
              </CardTitle>
              <CardDescription className="text-xs">
                Registro de alterações vinculado a este atendimento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l border-border/70 pl-4">
                {appointment.history.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[1.32rem] top-1 size-2 rounded-full border border-primary/40 bg-card" />
                    <p className="text-sm font-medium">
                      {historyLabel(entry.action)}
                    </p>
                    {entry.details ? (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {entry.details}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[0.68rem] text-muted-foreground/80">
                      {dateTime.format(entry.createdAt)} · {entry.actorName}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Ações</CardTitle>
              <CardDescription className="text-xs">
                O que você pode fazer com esta reserva.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AppointmentActions
                appointmentId={appointment.id}
                canCancel={canCancel}
                canReschedule={canReschedule}
                cancelMinHours={settings.cancelMinHours}
              />

              {!isActive || !isFuture ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {appointment.status === "cancelled"
                    ? "Esta reserva foi cancelada e o horário está liberado."
                    : appointment.status === "completed"
                      ? "Atendimento concluído. Você pode agendar novamente quando quiser."
                      : appointment.status === "no_show"
                        ? "Registrado como falta. Fale com o salão se precisar de ajuda."
                        : "Este horário já passou. Agende um novo atendimento quando quiser."}
                </p>
              ) : !canCancel || !canReschedule ? (
                <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  Alterações e cancelamentos pelo site são permitidos até{" "}
                  {settings.cancelMinHours}h antes do atendimento. Depois disso,
                  fale diretamente com o salão.
                </p>
              ) : null}

              <Separator />

              <IconLink href={rebookHref} label="Agendar novamente" variant="outline">
                <CalendarPlus className="size-4" />
              </IconLink>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CreditCard className="size-3.5" />
                  Situação
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
                    paid
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-border bg-secondary text-muted-foreground",
                  )}
                >
                  {paid ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <Clock3 className="size-3" />
                  )}
                  {paid ? "Pago" : "A pagar no salão"}
                </span>
              </div>
              {paid && appointment.paidAt ? (
                <p className="text-xs text-muted-foreground">
                  Registrado em {dateTime.format(appointment.paidAt)}.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  O pagamento é combinado diretamente com o salão no atendimento.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-accent/20">
            <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <MapPin className="size-3.5" />
                {settings.salonName}
              </p>
              {settings.address ? <p>{settings.address}</p> : null}
              {settings.phone ? (
                <p className="flex items-center gap-1.5">
                  <Phone className="size-3" />
                  {settings.phone}
                </p>
              ) : null}
              {settings.publicNotice ? (
                <p className="flex items-start gap-1.5 pt-1">
                  <Info className="mt-0.5 size-3 shrink-0" />
                  {settings.publicNotice}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {canReschedule ? (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
              Reagendamentos pelo site até {settings.rescheduleMinHours}h antes,
              conforme as regras do salão.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
