import {
  Banknote,
  CalendarDays,
  Clock3,
  History,
  Mail,
  MessageSquareText,
  Phone,
  Scissors,
  UserRound,
} from "lucide-react";

import { AdminCancelButton } from "@/components/admin/admin-cancel-button";
import { AdminRescheduleDialog } from "@/components/admin/admin-reschedule-dialog";
import { PaymentToggle } from "@/components/admin/payment-toggle";
import { QuickStatus } from "@/components/admin/quick-status";
import { IconLink } from "@/components/shared/icon-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AppointmentDetail } from "@/lib/booking/queries";
import {
  formatCurrency,
  formatDateTime,
  formatDayNumeric,
  formatDuration,
  formatMinuteRange,
  formatPhoneInput,
} from "@/lib/dates";
import { STATUS_LABELS } from "@/lib/booking/service";
import { cn } from "@/lib/utils";

const historyLabels: Record<string, string> = {
  created: "Agendamento criado",
  rescheduled: "Reagendado",
  cancelled: "Cancelado",
  payment: "Pagamento",
};

function historyTitle(action: string) {
  if (historyLabels[action]) return historyLabels[action];
  if (action.startsWith("status:")) {
    const key = action.replace("status:", "") as keyof typeof STATUS_LABELS;
    return `Status: ${STATUS_LABELS[key] ?? key}`;
  }
  return action;
}

export function AppointmentDetailCard({
  appointment,
  timezone,
  today,
}: {
  appointment: AppointmentDetail;
  timezone: string;
  today: string;
}) {
  const canModify =
    appointment.status === "pending" || appointment.status === "confirmed";
  const activeServiceIds = appointment.items
    .map((item) => item.serviceId)
    .filter((id): id is string => Boolean(id));
  const missingService = appointment.items.some((item) => !item.serviceId);

  return (
    // Consulta de container (e não da janela): o mesmo cartão aparece na página
    // completa e no drawer lateral da lista. Com `lg:` comum, dentro do drawer
    // (~420px de largura com janela de 1280px) as colunas deixavam o texto sem
    // espaço. Aqui a grade segue a largura realmente disponível.
    <div className="@container">
      <div className="grid gap-4 @2xl:grid-cols-[minmax(0,1fr)_18rem] @2xl:items-start">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg">{appointment.clientName}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a
                    href={`mailto:${appointment.clientEmail}`}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <Mail className="size-3" />
                    {appointment.clientEmail}
                  </a>
                  {appointment.clientPhone ? (
                    <a
                      href={`tel:${appointment.clientPhone}`}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <Phone className="size-3" />
                      {formatPhoneInput(appointment.clientPhone)}
                    </a>
                  ) : null}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={appointment.status} />
                <Badge
                  variant="outline"
                  className={cn(
                    appointment.paymentStatus === "paid"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-border text-muted-foreground",
                  )}
                >
                  <Banknote className="size-3" />
                  {appointment.paymentStatus === "paid" ? "Pago" : "A pagar"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 @sm:grid-cols-3">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="flex items-center gap-1.5 text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                  <CalendarDays className="size-3" />
                  Data
                </p>
                <p className="mt-1 text-sm font-medium">
                  {formatDayNumeric(appointment.startsOn)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="flex items-center gap-1.5 text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                  <Clock3 className="size-3" />
                  Horário
                </p>
                <p className="mt-1 text-sm font-medium tabular-nums">
                  {formatMinuteRange(appointment.startMinute, appointment.endMinute)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(appointment.totalDurationMin)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="flex items-center gap-1.5 text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                  <Scissors className="size-3" />
                  Total
                </p>
                <p className="mt-1 text-sm font-medium tabular-nums">
                  {formatCurrency(appointment.totalPriceCents)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {appointment.items.length} serviço
                  {appointment.items.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Serviços (valores preservados na reserva)
              </p>
              <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
                {appointment.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Scissors className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.serviceName}</span>
                      {!item.serviceId ? (
                        <Badge variant="outline" className="text-[0.6rem]">
                          serviço excluído
                        </Badge>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDuration(item.durationMin)} ·{" "}
                      {formatCurrency(item.priceCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {appointment.notes ? (
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MessageSquareText className="size-3.5" />
                  Observações da cliente
                </p>
                <p className="rounded-lg bg-secondary/40 p-3 text-sm whitespace-pre-line">
                  {appointment.notes}
                </p>
              </div>
            ) : null}

            {appointment.status === "cancelled" && appointment.cancelReason ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <p className="font-medium">Motivo do cancelamento</p>
                <p className="mt-0.5 text-rose-700">{appointment.cancelReason}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4 text-muted-foreground" />
              Histórico
            </CardTitle>
            <CardDescription>
              Registro imutável de tudo o que aconteceu com este agendamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {appointment.history.map((entry, index) => (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "mt-1 size-2 rounded-full",
                        index === appointment.history.length - 1
                          ? "bg-primary"
                          : "bg-border",
                      )}
                    />
                    {index < appointment.history.length - 1 ? (
                      <span className="mt-1 w-px flex-1 bg-border" />
                    ) : null}
                  </div>
                  <div className="min-w-0 pb-1">
                    <p className="text-sm font-medium">
                      {historyTitle(entry.action)}
                    </p>
                    {entry.details ? (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {entry.details}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[0.65rem] text-muted-foreground/80">
                      {entry.actorName} ·{" "}
                      {formatDateTime(entry.createdAt, timezone)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickStatus
              appointmentId={appointment.id}
              status={appointment.status}
            />

            {canModify ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <PaymentToggle
                    appointmentId={appointment.id}
                    paid={appointment.paymentStatus === "paid"}
                  />
                  <AdminRescheduleDialog
                    appointmentId={appointment.id}
                    day={appointment.startsOn}
                    startMinute={appointment.startMinute}
                    durationMin={appointment.totalDurationMin}
                    serviceIds={activeServiceIds}
                    today={today}
                    disabled={missingService}
                  />
                  <AdminCancelButton
                    appointmentId={appointment.id}
                    clientName={appointment.clientName.split(" ")[0] ?? appointment.clientName}
                  />
                </div>
                {missingService ? (
                  <p className="px-1 text-[0.68rem] leading-relaxed text-muted-foreground">
                    Um dos serviços foi excluído do catálogo. Reagendamento pelo
                    painel fica indisponível; crie um novo agendamento para a
                    cliente.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="space-y-2">
                <p className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
                  Este agendamento está {STATUS_LABELS[appointment.status].toLowerCase()}{" "}
                  e não pode mais ser alterado. O pagamento continua editável.
                </p>
                <PaymentToggle
                  appointmentId={appointment.id}
                  paid={appointment.paymentStatus === "paid"}
                />
              </div>
            )}

            <Separator />
            <IconLink
              href={`/admin/clientes/${appointment.clientId}`}
              label="Ver ficha da cliente"
              variant="ghost"
              size="icon-sm"
            >
              <UserRound className="size-4" />
            </IconLink>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="space-y-1.5 text-xs text-muted-foreground">
            <p>
              Criado em{" "}
              <span className="text-foreground">
                {formatDateTime(appointment.createdAt, timezone)}
              </span>
            </p>
            <p>
              Última atualização{" "}
              <span className="text-foreground">
                {formatDateTime(appointment.updatedAt, timezone)}
              </span>
            </p>
            <p>
              Identificador{" "}
              <span className="font-mono text-[0.65rem] break-all text-foreground">
                {appointment.id}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
