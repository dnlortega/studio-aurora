import { ArrowRight, Clock3, Hand } from "lucide-react";

import { IconLink } from "@/components/shared/icon-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AppointmentListItem } from "@/lib/booking/queries";
import {
  formatCurrency,
  formatDayNumeric,
  formatDayShort,
  formatDuration,
  formatMinuteRange,
} from "@/lib/dates";

export function AppointmentCard({
  appointment,
  href,
  showPrice = true,
}: {
  appointment: AppointmentListItem;
  href?: string;
  showPrice?: boolean;
}) {
  const date = appointment.startsOn;
  const weekday = formatDayShort(date).split(",")[0] ?? "";
  const names = appointment.items.map((item) => item.serviceName);
  const target = href ?? `/painel/agendamentos/${appointment.id}`;

  return (
    <Card className="border-border/80 transition-colors hover:border-primary/30">
      <CardContent className="flex items-start gap-3 p-4 sm:gap-4">
        <div className="flex w-[4.5rem] shrink-0 flex-col items-center rounded-xl border border-border/70 bg-secondary/60 px-1 py-2 text-center">
          <span className="text-[0.6rem] first-letter:uppercase text-muted-foreground">
            {weekday}
          </span>
          <span className="font-heading text-xs leading-tight tabular-nums">
            {formatDayNumeric(date)}
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums">
              <Clock3 className="size-3.5 text-muted-foreground" />
              {formatMinuteRange(appointment.startMinute, appointment.endMinute)}
            </span>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="flex items-start gap-1.5 text-sm text-foreground">
            <Hand className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="line-clamp-2">
              {names.length > 0 ? names.join(" · ") : "Atendimento"}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDuration(appointment.totalDurationMin)}
            {showPrice ? ` · ${formatCurrency(appointment.totalPriceCents)}` : null}
            {appointment.status === "pending" ? " · aguardando confirmação" : ""}
          </p>
        </div>

        <IconLink
          href={target}
          label={`Ver detalhes do agendamento de ${formatDayNumeric(date)}`}
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
        >
          <ArrowRight className="size-4" />
        </IconLink>
      </CardContent>
    </Card>
  );
}
