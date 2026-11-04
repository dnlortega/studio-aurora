import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  History,
  Scissors,
} from "lucide-react";

import { AppointmentCard } from "@/components/painel/appointment-card";
import { EmptyState } from "@/components/shared/empty-state";
import { IconLink } from "@/components/shared/icon-button";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/guards";
import { getClientAppointments } from "@/lib/booking/queries";
import { getSalonNow } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Meus agendamentos" };

const FILTERS = [
  { value: "proximos", label: "Próximos" },
  { value: "historico", label: "Histórico" },
  { value: "todos", label: "Todos" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const [params, user, settings] = await Promise.all([
    searchParams,
    requireUser("/painel/agendamentos"),
    getSettings(),
  ]);

  const filter: FilterValue = FILTERS.some((item) => item.value === params.filtro)
    ? (params.filtro as FilterValue)
    : "proximos";

  const now = getSalonNow(settings.timezone);
  const appointments = await getClientAppointments(user.id, {
    scope:
      filter === "proximos"
        ? "upcoming"
        : filter === "historico"
          ? "history"
          : "all",
    now,
    limit: 50,
  });

  const emptyCopy =
    filter === "proximos"
      ? {
          icon: CalendarDays,
          title: "Nenhum horário futuro",
          description:
            "Quando você marcar um atendimento, ele aparece aqui com data, horário e status.",
        }
      : filter === "historico"
        ? {
            icon: History,
            title: "Histórico ainda vazio",
            description:
              "Atendimentos concluídos, cancelados ou com falta ficam registrados aqui.",
          }
        : {
            icon: CalendarX2,
            title: "Você ainda não tem agendamentos",
            description:
              "Escolha os serviços e encontre um horário livre na agenda do salão.",
          };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Minha agenda"
        title="Meus agendamentos"
        description="Acompanhe seus horários, veja o status de cada reserva e acesse os detalhes para remarcar ou cancelar."
        actions={
          <IconLink href="/" label="Novo agendamento">
            <CalendarPlus className="size-4" />
          </IconLink>
        }
      />

      <div
        role="tablist"
        aria-label="Filtrar agendamentos"
        className="flex w-full gap-1 overflow-x-auto rounded-lg border border-border/70 bg-card p-1 sm:w-fit"
      >
        {FILTERS.map((item) => {
          const active = filter === item.value;
          return (
            <Link
              key={item.value}
              href={`/painel/agendamentos?filtro=${item.value}`}
              role="tab"
              aria-selected={active}
              className={cn(
                "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-center text-sm transition-colors sm:flex-none",
                active
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          icon={emptyCopy.icon}
          title={emptyCopy.title}
          description={emptyCopy.description}
          action={
            filter === "proximos" ? (
              <IconLink href="/" label="Encontrar um horário">
                <CalendarPlus className="size-4" />
              </IconLink>
            ) : filter === "historico" ? (
              <IconLink
                href="/painel/agendamentos?filtro=proximos"
                label="Ver próximos"
                variant="outline"
              >
                <ArrowRight className="size-4" />
              </IconLink>
            ) : (
              <IconLink
                href="/servicos"
                label="Ver catálogo"
                variant="outline"
              >
                <Scissors className="size-4" />
              </IconLink>
            )
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {appointments.length} agendamento
            {appointments.length > 1 ? "s" : ""} encontrado
            {appointments.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
