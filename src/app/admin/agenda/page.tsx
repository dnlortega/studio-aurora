import Link from "next/link";
import {
  CalendarOff,
  CalendarPlus,
  Clock3,
  Coffee,
  DoorClosed,
  Eye,
  Info,
} from "lucide-react";

import { AgendaToolbar, type AgendaView } from "@/components/admin/agenda-toolbar";
import { QuickStatus } from "@/components/admin/quick-status";
import {
  MissingPhoneHint,
  WhatsAppReminderLink,
} from "@/components/admin/whatsapp-reminder-link";
import { EmptyState } from "@/components/shared/empty-state";
import { IconLink } from "@/components/shared/icon-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge, statusConfig } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  getAppointmentsBetween,
  getAppointmentsForDay,
  getBlocksBetween,
  getBusinessHours,
  type AppointmentListItem,
} from "@/lib/booking/queries";
import {
  addDays,
  daysInMonth,
  formatCurrency,
  formatDateRange,
  formatDayNumeric,
  formatDuration,
  formatMinuteRange,
  formatMonth,
  getSalonNow,
  minutesToTime,
  monthKey,
  startOfWeek,
  weekdayOf,
  weekdayName,
  weekdayShort,
} from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{ view?: string; date?: string }>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function shiftMonth(day: string, delta: number) {
  const [year, month] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + delta, 1))
    .toISOString()
    .slice(0, 10);
}

function groupByDay(items: AppointmentListItem[]) {
  const map = new Map<string, AppointmentListItem[]>();
  for (const item of items) {
    const list = map.get(item.startsOn) ?? [];
    list.push(item);
    map.set(item.startsOn, list);
  }
  return map;
}

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  // Defesa em profundidade: o layout já bloqueia, mas a página também exige o
  // perfil administrativo antes de qualquer consulta.
  await requireAdmin("/admin/agenda");
  const settings = await getSettings();
  const now = getSalonNow(settings.timezone);

  const view: AgendaView =
    params.view === "week" || params.view === "month" ? params.view : "day";
  const date =
    params.date && DATE_PATTERN.test(params.date) ? params.date : now.day;

  const rangeStart =
    view === "day"
      ? date
      : view === "week"
        ? startOfWeek(date, 0)
        : daysInMonth(monthKey(date))[0];
  const rangeEnd =
    view === "day"
      ? date
      : view === "week"
        ? addDays(startOfWeek(date, 0), 6)
        : daysInMonth(monthKey(date)).at(-1) ?? date;

  const [appointments, hours, blocks] = await Promise.all([
    view === "day"
      ? getAppointmentsForDay(date)
      : getAppointmentsBetween(rangeStart, rangeEnd),
    getBusinessHours(),
    getBlocksBetween(rangeStart, rangeEnd),
  ]);

  const previousDate =
    view === "day"
      ? addDays(date, -1)
      : view === "week"
        ? addDays(date, -7)
        : shiftMonth(date, -1);
  const nextDate =
    view === "day"
      ? addDays(date, 1)
      : view === "week"
        ? addDays(date, 7)
        : shiftMonth(date, 1);

  const label =
    view === "day"
      ? formatDayNumeric(date)
      : view === "week"
        ? formatDateRange(rangeStart, rangeEnd)
        : formatMonth(monthKey(date));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Sua agenda"
        description="Consulte dia, semana ou mês. A disponibilidade respeita expediente, intervalo, bloqueios e duração total dos serviços."
        actions={
          <IconLink
            href={`/admin/agendamentos/novo?data=${date}`}
            label="Novo agendamento"
          >
            <CalendarPlus className="size-4" />
          </IconLink>
        }
      />

      <AgendaToolbar
        view={view}
        date={date}
        label={label}
        previousDate={previousDate}
        nextDate={nextDate}
        today={now.day}
      />

      {view === "day" ? (
        <DayView
          date={date}
          appointments={appointments}
          hours={hours}
          blocks={blocks}
          settings={settings}
        />
      ) : null}

      {view === "week" ? (
        <WeekView
          start={rangeStart}
          appointments={appointments}
          hours={hours}
          blocks={blocks}
          today={now.day}
        />
      ) : null}

      {view === "month" ? (
        <MonthView
          date={date}
          appointments={appointments}
          hours={hours}
          today={now.day}
        />
      ) : null}
    </div>
  );
}

type HoursRow = Awaited<ReturnType<typeof getBusinessHours>>[number];
type BlockRow = Awaited<ReturnType<typeof getBlocksBetween>>[number];
type SalonSettings = Awaited<ReturnType<typeof getSettings>>;

function DayView({
  date,
  appointments,
  hours,
  blocks,
  settings,
}: {
  date: string;
  appointments: AppointmentListItem[];
  hours: HoursRow[];
  blocks: BlockRow[];
  settings: SalonSettings;
}) {
  const timezone = settings.timezone;
  const weekday = weekdayOf(date);
  const dayHours = hours.find((row) => row.weekday === weekday) ?? null;
  const dayBlocks = blocks.filter((block) => block.day === date);
  const active = appointments.filter(
    (item) => item.status === "pending" || item.status === "confirmed",
  );
  const completed = appointments.filter((item) => item.status === "completed");
  const cancelled = appointments.filter((item) => item.status === "cancelled");

  const openMinute = dayHours?.openMinute ?? 0;
  const closeMinute = dayHours?.closeMinute ?? 0;
  const breakMinute =
    dayHours?.breakStartMinute && dayHours.breakEndMinute
      ? dayHours.breakEndMinute - dayHours.breakStartMinute
      : 0;
  const capacity = dayHours?.isOpen
    ? Math.max(0, closeMinute - openMinute - breakMinute)
    : 0;
  const occupied = appointments
    .filter((item) => item.status !== "cancelled")
    .reduce((total, item) => total + item.totalDurationMin, 0);
  const occupation = capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start">
      <Card>
        <CardHeader>
          <CardTitle>Atendimentos do dia</CardTitle>
          <CardDescription>
            {appointments.length} registro{appointments.length === 1 ? "" : "s"} ·{" "}
            {active.length} ativo{active.length === 1 ? "" : "s"} ·{" "}
            {completed.length} concluído{completed.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <EmptyState
              icon={CalendarOff}
              title="Nenhum atendimento neste dia"
              description={
                dayHours?.isOpen
                  ? "A agenda está livre. Você pode criar um agendamento manual para uma cliente."
                  : "O salão está fechado neste dia da semana. Confira os horários de funcionamento ou crie um bloqueio/folga."
              }
              action={
                <IconLink
                  href={`/admin/agendamentos/novo?data=${date}`}
                  label="Criar agendamento"
                  variant="outline"
                  size="icon-sm"
                >
                  <CalendarPlus className="size-4" />
                </IconLink>
              }
            />
          ) : (
            <div className="space-y-1">
              {appointments.map((appointment, index) => (
                <div key={appointment.id}>
                  {index > 0 ? <Separator className="my-1" /> : null}
                  <div
                    className={cn(
                      "flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-3",
                      appointment.status === "cancelled" && "opacity-60",
                    )}
                  >
                    <div className="flex w-24 shrink-0 items-baseline gap-1.5 sm:block">
                      <p className="text-sm font-medium tabular-nums">
                        {minutesToTime(appointment.startMinute)}
                      </p>
                      <p className="text-[0.68rem] text-muted-foreground">
                        até {minutesToTime(appointment.endMinute)} ·{" "}
                        {formatDuration(appointment.totalDurationMin)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/agendamentos/${appointment.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {appointment.clientName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {appointment.items
                          .map((item) => item.serviceName)
                          .join(" + ") || "Sem serviços"}
                      </p>
                      {appointment.notes ? (
                        <p className="mt-0.5 line-clamp-1 text-[0.68rem] text-muted-foreground/80">
                          Obs.: {appointment.notes}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-sm tabular-nums sm:w-24 sm:text-right">
                      {formatCurrency(appointment.totalPriceCents)}
                    </span>
                    <QuickStatus
                      appointmentId={appointment.id}
                      status={appointment.status}
                      compact
                    />
                    <WhatsAppReminderLink
                      appointment={appointment}
                      salonName={settings.salonName}
                      address={settings.address}
                      fallback={<MissingPhoneHint name={appointment.clientName} />}
                    />
                    <IconLink
                      href={`/admin/agendamentos/${appointment.id}`}
                      label="Detalhes"
                      variant="ghost"
                      size="icon-xs"
                      className="self-start sm:self-auto"
                    >
                      <Eye className="size-3.5" />
                    </IconLink>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="size-4 text-muted-foreground" />
              Expediente
            </CardTitle>
            <CardDescription className="first-letter:uppercase">
              {weekdayName(weekday)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!dayHours?.isOpen ? (
              <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                <DoorClosed className="mt-0.5 size-4 shrink-0" />
                <span>Salão fechado neste dia.</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Abertura</span>
                  <span className="tabular-nums">
                    {minutesToTime(dayHours.openMinute)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fechamento</span>
                  <span className="tabular-nums">
                    {minutesToTime(dayHours.closeMinute)}
                  </span>
                </div>
                {dayHours.breakStartMinute !== null &&
                dayHours.breakEndMinute !== null ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Coffee className="size-3.5" />
                      Intervalo
                    </span>
                    <span className="tabular-nums">
                      {formatMinuteRange(
                        dayHours.breakStartMinute,
                        dayHours.breakEndMinute,
                      )}
                    </span>
                  </div>
                ) : null}

                <Separator />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Ocupação</span>
                    <span className="font-medium tabular-nums">{occupation}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${occupation}%` }}
                    />
                  </div>
                  <p className="text-[0.7rem] text-muted-foreground">
                    {formatDuration(occupied)} ocupados de{" "}
                    {formatDuration(capacity)} disponíveis.
                  </p>
                </div>
              </>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(["pending", "confirmed", "completed", "cancelled"] as const).map(
                (status) =>
                  appointments.some((item) => item.status === status) ? (
                    <StatusBadge key={status} status={status} />
                  ) : null,
              )}
            </div>
            <p className="text-[0.68rem] text-muted-foreground">
              Fuso: {timezone.replaceAll("_", " ")}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="size-4 text-muted-foreground" />
              Bloqueios e folgas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dayBlocks.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum bloqueio cadastrado para este dia.
              </p>
            ) : (
              dayBlocks.map((block) => (
                <div key={block.id} className="rounded-lg bg-muted/50 p-2.5 text-xs">
                  <p className="font-medium tabular-nums">
                    {formatMinuteRange(block.startMinute, block.endMinute)}
                  </p>
                  <p className="text-muted-foreground">{block.reason}</p>
                </div>
              ))
            )}
            <Link
              href="/admin/bloqueios"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Gerenciar bloqueios
            </Link>
          </CardContent>
        </Card>

        {cancelled.length > 0 ? (
          <p className="flex items-start gap-1.5 px-1 text-[0.68rem] text-muted-foreground">
            <Info className="mt-0.5 size-3 shrink-0" />
            {cancelled.length} cancelamento
            {cancelled.length > 1 ? "s" : ""} no dia não ocupa horário na agenda.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function WeekView({
  start,
  appointments,
  hours,
  blocks,
  today,
}: {
  start: string;
  appointments: AppointmentListItem[];
  hours: HoursRow[];
  blocks: BlockRow[];
  today: string;
}) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const grouped = groupByDay(appointments);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      {days.map((day) => {
        const dayAppointments = (grouped.get(day) ?? []).filter(
          (item) => item.status !== "cancelled",
        );
        const dayHours = hours.find((row) => row.weekday === weekdayOf(day));
        const dayBlocks = blocks.filter((block) => block.day === day);
        const isToday = day === today;

        return (
          <Card
            key={day}
            size="sm"
            className={cn(
              "min-w-0",
              isToday && "ring-2 ring-primary/40",
            )}
          >
            <CardHeader className="gap-0.5">
              <Link
                href={`/admin/agenda?view=day&date=${day}`}
                className="flex items-baseline justify-between gap-1 hover:underline"
              >
                <CardTitle className="text-sm">
                  {weekdayShort(weekdayOf(day))}{" "}
                  <span className="font-normal text-muted-foreground">
                    {day.slice(8)}
                  </span>
                </CardTitle>
                <span className="text-[0.65rem] text-muted-foreground">
                  {dayAppointments.length}
                </span>
              </Link>
              {!dayHours?.isOpen ? (
                <p className="text-[0.65rem] text-muted-foreground">Fechado</p>
              ) : (
                <p className="text-[0.65rem] text-muted-foreground">
                  {minutesToTime(dayHours.openMinute)}–{minutesToTime(dayHours.closeMinute)}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-1">
              {dayAppointments.length === 0 ? (
                <p className="py-2 text-[0.68rem] text-muted-foreground">
                  Sem atendimentos.
                </p>
              ) : (
                dayAppointments.map((appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/admin/agendamentos/${appointment.id}`}
                    className="block rounded-md border border-border/70 bg-background px-1.5 py-1 text-[0.68rem] transition-colors hover:border-primary/40"
                  >
                    <span className="flex items-center gap-1 font-medium tabular-nums">
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          statusConfig[appointment.status].dot,
                        )}
                      />
                      {minutesToTime(appointment.startMinute)}
                    </span>
                    <span className="mt-0.5 block truncate text-muted-foreground">
                      {appointment.clientName}
                    </span>
                  </Link>
                ))
              )}
              {dayBlocks.length > 0 ? (
                <p className="rounded-md bg-muted/60 px-1.5 py-1 text-[0.62rem] text-muted-foreground">
                  {dayBlocks.length} bloqueio{dayBlocks.length > 1 ? "s" : ""}
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MonthView({
  date,
  appointments,
  hours,
  today,
}: {
  date: string;
  appointments: AppointmentListItem[];
  hours: HoursRow[];
  today: string;
}) {
  const month = monthKey(date);
  const days = daysInMonth(month);
  const offset = weekdayOf(days[0]);
  const grouped = groupByDay(appointments);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="first-letter:uppercase">
          {formatMonth(month)}
        </CardTitle>
        <CardDescription>
          Clique em um dia para abrir a agenda detalhada. Os números mostram
          atendimentos ativos (sem cancelamentos).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
            <div
              key={label}
              className="pb-1 text-center text-[0.62rem] font-medium tracking-wide text-muted-foreground uppercase"
            >
              {label}
            </div>
          ))}
          {Array.from({ length: offset }).map((_, index) => (
            <div key={`empty-${index}`} aria-hidden="true" />
          ))}
          {days.map((day) => {
            const dayAppointments = (grouped.get(day) ?? []).filter(
              (item) => item.status !== "cancelled",
            );
            const dayHours = hours.find(
              (row) => row.weekday === weekdayOf(day),
            );
            const isToday = day === today;
            return (
              <Link
                key={day}
                href={`/admin/agenda?view=day&date=${day}`}
                className={cn(
                  "flex min-h-20 flex-col gap-1 rounded-lg border border-border/60 p-1.5 text-xs transition-colors hover:border-primary/40 hover:bg-muted/30 sm:min-h-24 sm:p-2",
                  isToday && "border-primary/50 bg-primary/[0.04]",
                  !dayHours?.isOpen && "bg-muted/20 text-muted-foreground",
                )}
                aria-label={`${formatDayNumeric(day)}: ${dayAppointments.length} atendimentos`}
              >
                <span
                  className={cn(
                    "inline-flex size-5 items-center justify-center rounded-full text-[0.7rem] font-medium tabular-nums",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {day.slice(8)}
                </span>
                {dayAppointments.length > 0 ? (
                  <>
                    <span className="text-[0.65rem] font-medium">
                      {dayAppointments.length} atend.
                    </span>
                    <span className="hidden flex-wrap gap-0.5 sm:flex">
                      {dayAppointments.slice(0, 5).map((appointment) => (
                        <span
                          key={appointment.id}
                          className={cn(
                            "size-1.5 rounded-full",
                            statusConfig[appointment.status].dot,
                          )}
                          title={`${minutesToTime(appointment.startMinute)} · ${
                            appointment.clientName
                          }`}
                        />
                      ))}
                    </span>
                  </>
                ) : (
                  <span className="text-[0.62rem] text-muted-foreground/70">
                    {dayHours?.isOpen ? "livre" : "fechado"}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/70 pt-3 text-[0.65rem] text-muted-foreground">
          {(["pending", "confirmed", "completed"] as const).map((status) => (
            <span key={status} className="inline-flex items-center gap-1">
              <span className={cn("size-1.5 rounded-full", statusConfig[status].dot)} />
              {statusConfig[status].label}
            </span>
          ))}
          <span className="ml-auto inline-flex items-center gap-1">
            <CalendarPlus className="size-3" />
            <Link href="/admin/agendamentos/novo" className="hover:underline">
              novo agendamento
            </Link>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
