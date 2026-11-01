import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { IconLink, IconSubmitButton } from "@/components/shared/icon-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AgendaView = "day" | "week" | "month";

const views: { value: AgendaView; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

export function AgendaToolbar({
  view,
  date,
  label,
  previousDate,
  nextDate,
  today,
}: {
  view: AgendaView;
  date: string;
  label: string;
  previousDate: string;
  nextDate: string;
  today: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1.5">
        <IconLink
          href={`/admin/agenda?view=${view}&date=${previousDate}`}
          label="Período anterior"
          variant="outline"
        >
          <ChevronLeft className="size-4" />
        </IconLink>
        <IconLink
          href={`/admin/agenda?view=${view}&date=${today}`}
          label="Hoje"
          variant="outline"
          size="icon-sm"
        >
          <CalendarDays className="size-4" />
        </IconLink>
        <IconLink
          href={`/admin/agenda?view=${view}&date=${nextDate}`}
          label="Próximo período"
          variant="outline"
        >
          <ChevronRight className="size-4" />
        </IconLink>
        <p className="ml-1 truncate text-sm font-medium first-letter:uppercase">
          {label}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
          role="group"
          aria-label="Visualização da agenda"
        >
          {views.map((option) => (
            <Link
              key={option.value}
              href={`/admin/agenda?view=${option.value}&date=${date}`}
              aria-current={view === option.value ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                view === option.value
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <form
          action="/admin/agenda"
          method="get"
          className="flex items-center gap-1.5"
        >
          <input type="hidden" name="view" value={view} />
          <Input
            type="date"
            name="date"
            defaultValue={date}
            aria-label="Ir para uma data"
            className="h-8 w-[9.5rem] text-xs"
          />
          <IconSubmitButton
            label="Ir"
            variant="outline"
            size="icon-sm"
            icon={<ArrowRight className="size-4" />}
          />
        </form>

        <IconLink
          href={`/admin/agendamentos/novo?data=${date}`}
          label="Agendar"
          size="icon-sm"
        >
          <CalendarPlus className="size-4" />
        </IconLink>
      </div>
    </div>
  );
}
