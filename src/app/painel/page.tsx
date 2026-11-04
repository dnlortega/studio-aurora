import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Clock3,
  Eye,
  Info,
  Scissors,
  Sparkles,
  UserRound,
} from "lucide-react";

import { AppointmentCard } from "@/components/painel/appointment-card";
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
import {
  getClientAppointments,
  getUpcomingAppointment,
} from "@/lib/booking/queries";
import {
  daysBetween,
  formatCurrency,
  formatDayNumeric,
  formatDuration,
  formatMinuteRange,
  getSalonNow,
} from "@/lib/dates";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Visão geral" };

export default async function PainelHomePage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; criado?: string }>;
}) {
  const [params, user, settings] = await Promise.all([
    searchParams,
    requireUser("/painel"),
    getSettings(),
  ]);
  const now = getSalonNow(settings.timezone);

  const [next, upcoming, history] = await Promise.all([
    getUpcomingAppointment(user.id, now),
    getClientAppointments(user.id, { scope: "upcoming", now, limit: 5 }),
    getClientAppointments(user.id, { scope: "history", now, limit: 3 }),
  ]);

  const others = upcoming.filter((item) => item.id !== next?.id).slice(0, 3);
  const canRescheduleNext = next
    ? daysBetween(now.day, next.startsOn) * 24 * 60 +
        next.startMinute -
        now.minute >=
      settings.rescheduleMinHours * 60
    : false;
  const firstName = user.name.split(" ")[0] ?? user.name;
  const hour = Math.floor(now.minute / 60);
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="eyebrow">Minha agenda</p>
          <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {next
              ? "Seu próximo atendimento está logo abaixo. Precisa de algo diferente?"
              : "Pronta para o próximo cuidado? Escolha um serviço e veja os horários livres."}
          </p>
        </div>
        <IconLink href="/" label="Novo agendamento" className="self-start sm:self-auto">
          <CalendarPlus className="size-4" />
        </IconLink>
      </div>

      {params.aviso === "sem-permissao" ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900"
        >
          <Info className="mt-0.5 size-4 shrink-0" />
          Sua conta não tem acesso ao painel administrativo. Este é o seu espaço
          pessoal de agendamentos.
        </div>
      ) : null}

      {params.criado ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900"
        >
          <CalendarCheck2 className="mt-0.5 size-4 shrink-0" />
          Agendamento registrado. Você pode acompanhar tudo por aqui.
        </div>
      ) : null}

      <section aria-labelledby="proximo-title">
        <h2 id="proximo-title" className="sr-only">
          Próximo agendamento
        </h2>
        {next ? (
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-accent/40 via-card to-card">
            <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow">Próximo atendimento</span>
                  <StatusBadge status={next.status} />
                </div>
                <div>
                  <p className="font-heading text-2xl sm:text-3xl">
                    {formatDayNumeric(next.startsOn)}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Clock3 className="size-3.5" />
                      {formatMinuteRange(next.startMinute, next.endMinute)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Scissors className="size-3.5" />
                      {formatDuration(next.totalDurationMin)}
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(next.totalPriceCents)}
                    </span>
                  </p>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {next.items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {item.serviceName}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <IconLink href={`/painel/agendamentos/${next.id}`} label="Ver detalhes">
                  <Eye className="size-4" />
                </IconLink>
                {canRescheduleNext &&
                (next.status === "pending" || next.status === "confirmed") ? (
                  <IconLink
                    href={`/?reagendar=${next.id}`}
                    label="Reagendar"
                    variant="outline"
                  >
                    <CalendarClock className="size-4" />
                  </IconLink>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-2">
              <EmptyState
                className="border-0 bg-transparent"
                icon={Sparkles}
                title="Nenhum horário marcado"
                description="Escolha os serviços que você quer e veja os horários realmente disponíveis na agenda do salão."
                action={
                  <IconLink href="/" label="Encontrar um horário">
                    <CalendarPlus className="size-4" />
                  </IconLink>
                }
              />
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section className="space-y-3" aria-labelledby="proximos-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="proximos-title" className="text-lg font-medium">
              Próximos horários
            </h2>
            <Link
              href="/painel/agendamentos"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Ver todos
            </Link>
          </div>

          {others.length > 0 ? (
            <div className="space-y-3">
              {others.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-8 text-center">
              <CalendarDays className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">
                {next ? "Só este atendimento por enquanto" : "Sua agenda está livre"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Você pode marcar quantos cuidados quiser, respeitando a agenda
                do salão.
              </p>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Atalhos</CardTitle>
              <CardDescription className="text-xs">
                O que você precisa hoje?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 p-2 pt-0">
              {[
                {
                  href: "/",
                  icon: CalendarPlus,
                  label: "Agendar um novo horário",
                },
                {
                  href: "/servicos",
                  icon: Scissors,
                  label: "Ver serviços e preços",
                },
                {
                  href: "/painel/perfil",
                  icon: UserRound,
                  label: "Atualizar meus dados",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/70"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                    <item.icon className="size-4" />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                Últimos atendimentos
              </CardTitle>
              <CardDescription className="text-xs">
                Seu histórico recente no salão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {history.length > 0 ? (
                <>
                  {history.map((appointment) => (
                    <div key={appointment.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">
                          {formatDayNumeric(appointment.startsOn)}
                        </p>
                        <StatusBadge
                          status={appointment.status}
                          className="scale-90"
                        />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {appointment.items
                          .map((item) => item.serviceName)
                          .join(" · ")}
                      </p>
                      <Separator className="mt-2 last:hidden" />
                    </div>
                  ))}
                  <Link
                    href="/painel/agendamentos?filtro=historico"
                    className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Ver histórico completo
                    <ArrowRight className="size-3.5" />
                  </Link>
                </>
              ) : (
                <p className="py-2 text-xs text-muted-foreground">
                  Seus atendimentos concluídos aparecerão aqui.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
