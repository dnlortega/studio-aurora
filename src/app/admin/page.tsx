import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CalendarCheck2,
  CalendarOff,
  CalendarPlus,
  CalendarX2,
  CheckCircle2,
  Clock3,
  TrendingUp,
  UsersRound,
  Wallet,
} from "lucide-react";

import { DashboardChart } from "@/components/admin/dashboard-chart";
import { KpiCard } from "@/components/admin/kpi-card";
import { QuickStatus } from "@/components/admin/quick-status";
import {
  MissingPhoneHint,
  WhatsAppReminderLink,
} from "@/components/admin/whatsapp-reminder-link";
import { IconLink } from "@/components/shared/icon-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getDashboardData } from "@/lib/booking/queries";
import {
  formatCurrency,
  formatDayNumeric,
  formatDuration,
  formatMinuteRange,
  formatMonth,
} from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";

export default async function AdminDashboardPage() {
  const [user, settings] = await Promise.all([requireAdmin("/admin"), getSettings()]);
  const data = await getDashboardData();

  const greeting =
    data.now.minute < 12 * 60
      ? "Bom dia"
      : data.now.minute < 18 * 60
        ? "Boa tarde"
        : "Boa noite";

  const topMax = Math.max(1, ...data.topServices.map((item) => item.count));
  const cancellationRate = Math.round(data.month.cancellationRate * 100);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={formatDayNumeric(data.now.day)}
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        description={`Visão geral do ${settings.salonName}. Dados de ${formatMonth(
          data.month.key,
        )}, sempre no fuso ${settings.timezone.replaceAll("_", " ")}.`}
        actions={
          <>
            <IconLink href="/admin/agendamentos/novo" label="Novo agendamento">
              <CalendarPlus className="size-4" />
            </IconLink>
            <IconLink
              href="/admin/agenda"
              label="Abrir agenda"
              variant="outline"
            >
              <CalendarCheck2 className="size-4" />
            </IconLink>
          </>
        }
      />

      <section
        aria-label="Indicadores do dia e do mês"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <KpiCard
          label="Atendimentos hoje"
          value={data.today.total}
          hint={`${data.today.confirmed} confirmados · ${data.today.pending} pendentes`}
          icon={CalendarCheck2}
        />
        <KpiCard
          label="Receita prevista hoje"
          value={formatCurrency(data.today.expectedRevenueCents)}
          hint="Agendamentos pendentes e confirmados"
          icon={Clock3}
          tone="warning"
        />
        <KpiCard
          label="Receita realizada no mês"
          value={formatCurrency(data.month.revenueRealizedCents)}
          hint={`${data.month.completed} atendimentos concluídos`}
          icon={Wallet}
          tone="positive"
        />
        <KpiCard
          label="Cancelamentos no mês"
          value={`${cancellationRate}%`}
          hint={`${data.month.cancelled} de ${data.month.total} agendamentos`}
          icon={CalendarX2}
          tone={cancellationRate >= 15 ? "negative" : "default"}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo dos últimos 14 dias</CardTitle>
            <CardDescription>
              Agendamentos ativos por dia (cancelamentos não entram na contagem).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardChart data={data.daily} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
              <span>
                Receita prevista em aberto neste mês:{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(data.month.revenueExpectedCents)}
                </span>
              </span>
              <Link
                href="/admin/relatorios"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Ver relatórios
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Serviços mais procurados</CardTitle>
            <CardDescription>No mês atual, por quantidade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum serviço registrado neste mês ainda.
              </p>
            ) : (
              data.topServices.map((service) => (
                <div key={service.serviceName} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">{service.serviceName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {service.count}× · {formatCurrency(service.revenueCents)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{
                        width: `${Math.max(
                          8,
                          Math.round((service.count / topMax) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Agenda de hoje</CardTitle>
            <CardDescription>
              {data.today.total === 0
                ? "Nenhum atendimento marcado para hoje."
                : `${data.today.total} atendimento${
                    data.today.total > 1 ? "s" : ""
                  } · receita prevista ${formatCurrency(
                    data.today.expectedRevenueCents,
                  )}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.upcoming.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                Nada mais previsto para hoje. Consulte a agenda para os próximos
                dias.
              </div>
            ) : (
              data.upcoming.map((appointment, index) => (
                <div key={appointment.id}>
                  {index > 0 ? <Separator className="my-1" /> : null}
                  <div className="flex flex-wrap items-center gap-3 py-2">
                    <div className="w-16 shrink-0">
                      <p className="text-sm font-medium tabular-nums">
                        {formatMinuteRange(
                          appointment.startMinute,
                          appointment.endMinute,
                        ).split(" – ")[0]}
                      </p>
                      <p className="text-[0.68rem] text-muted-foreground">
                        {formatDuration(appointment.totalDurationMin)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/agendamentos/${appointment.id}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {appointment.clientName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {appointment.items
                          .map((item) => item.serviceName)
                          .join(" + ") || "Sem serviços"}
                      </p>
                    </div>
                    <span className="hidden text-sm tabular-nums sm:block">
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
                      fallback={
                        <MissingPhoneHint name={appointment.clientName} />
                      }
                    />
                    <Link
                      href={`/admin/agendamentos/${appointment.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Detalhes
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações rápidas</CardTitle>
            <CardDescription>Atalhos para a operação do dia.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <IconLink
              href="/admin/agendamentos/novo"
              label="Agendar para uma cliente"
              variant="outline"
            >
              <CalendarPlus className="size-4" />
            </IconLink>
            <IconLink
              href="/admin/agenda?view=day"
              label="Conferir agenda do dia"
              variant="outline"
            >
              <CalendarCheck2 className="size-4" />
            </IconLink>
            <IconLink
              href="/admin/bloqueios"
              label="Bloquear folga ou horário"
              variant="outline"
            >
              <CalendarOff className="size-4" />
            </IconLink>
            <IconLink
              href="/admin/clientes"
              label="Gerenciar clientes"
              variant="outline"
            >
              <UsersRound className="size-4" />
            </IconLink>
            <IconLink
              href="/admin/relatorios"
              label="Fechamento e relatórios"
              variant="outline"
            >
              <BarChart3 className="size-4" />
            </IconLink>

            <div className="mt-3 space-y-2 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                Registro de ações ativo
              </p>
              <p>
                Toda alteração administrativa é registrada na auditoria, junto do
                histórico de cada agendamento.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card size="sm" className="border-0 bg-transparent ring-0">
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="size-3.5" />
            Receita realizada considera apenas atendimentos concluídos.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <StatusBadge status="pending" />
            pendentes precisam de confirmação
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
