import {
  Banknote,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarX2,
  Download,
  Percent,
  ReceiptText,
  TrendingUp,
} from "lucide-react";

import { KpiCard } from "@/components/admin/kpi-card";
import { ReportChart } from "@/components/admin/report-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { IconLink, IconSubmitButton } from "@/components/shared/icon-button";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getReport } from "@/lib/booking/queries";
import {
  addDays,
  daysBetween,
  formatCurrency,
  formatDayShort,
  formatDayNumeric,
  getSalonNow,
  monthKey,
} from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";

type SearchParams = Promise<{ de?: string; ate?: string }>;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin("/admin/relatorios");
  const params = await searchParams;
  const settings = await getSettings();
  const now = getSalonNow(settings.timezone);

  const monthStart = `${monthKey(now.day)}-01`;
  let from = params.de && DATE_PATTERN.test(params.de) ? params.de : monthStart;
  let to = params.ate && DATE_PATTERN.test(params.ate) ? params.ate : now.day;
  if (from > to) [from, to] = [to, from];

  const report = await getReport(from, to);
  const days = daysBetween(from, to);
  const cancellationRate =
    report.summary.total > 0
      ? Math.round((report.summary.cancelled / report.summary.total) * 100)
      : 0;
  const noShowRate =
    report.summary.total > 0
      ? Math.round((report.summary.noShow / report.summary.total) * 100)
      : 0;
  const totalServiceCount = report.byService.reduce(
    (total, service) => total + service.count,
    0,
  );

  const dailyData = report.byDay.map((entry) => ({
    ...entry,
    label: formatDayShort(entry.day).split(",")[0] ?? entry.day.slice(8),
  }));

  const exportHref = `/api/admin/relatorios/export?de=${from}&ate=${to}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relatórios"
        title="Resultados do período"
        description={`De ${formatDayNumeric(from)} a ${formatDayNumeric(to)} · ${days + 1} dia${
          days === 0 ? "" : "s"
        } analisados no fuso ${settings.timezone.replaceAll("_", " ")}.`}
        actions={
          <>
            <IconLink href={exportHref} label="Exportar CSV" variant="outline">
              <Download className="size-4" />
            </IconLink>
            <IconLink href="/admin/agendamentos" label="Ver agendamentos">
              <ReceiptText className="size-4" />
            </IconLink>
          </>
        }
      />

      <form
        action="/admin/relatorios"
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border/70 bg-card p-3"
      >
        <div className="space-y-1">
          <label htmlFor="report-from" className="text-[0.68rem] text-muted-foreground">
            De
          </label>
          <Input id="report-from" type="date" name="de" defaultValue={from} />
        </div>
        <div className="space-y-1">
          <label htmlFor="report-to" className="text-[0.68rem] text-muted-foreground">
            Até
          </label>
          <Input id="report-to" type="date" name="ate" defaultValue={to} />
        </div>
        <IconSubmitButton
          label="Aplicar período"
          variant="outline"
          icon={<CalendarDays className="size-4" />}
        />
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          <IconLink
            href={`/admin/relatorios?de=${monthStart}&ate=${now.day}`}
            label="Mês atual"
            variant="ghost"
            size="icon-xs"
          >
            <CalendarCheck className="size-3.5" />
          </IconLink>
          <IconLink
            href={`/admin/relatorios?de=${addDays(now.day, -6)}&ate=${now.day}`}
            label="7 dias"
            variant="ghost"
            size="icon-xs"
          >
            <CalendarClock className="size-3.5" />
          </IconLink>
          <IconLink
            href={`/admin/relatorios?de=${addDays(now.day, -29)}&ate=${now.day}`}
            label="30 dias"
            variant="ghost"
            size="icon-xs"
          >
            <CalendarRange className="size-3.5" />
          </IconLink>
        </div>
      </form>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Atendimentos no período"
          value={report.summary.total}
          hint={`${report.summary.completed} concluídos · ${report.summary.pending + report.summary.confirmed} em aberto`}
          icon={CalendarDays}
        />
        <KpiCard
          label="Receita realizada"
          value={formatCurrency(report.summary.revenueCents)}
          hint="Somente atendimentos concluídos"
          icon={Banknote}
          tone="positive"
        />
        <KpiCard
          label="Ticket médio"
          value={formatCurrency(report.summary.averageTicketCents)}
          hint="Receita ÷ atendimentos concluídos"
          icon={TrendingUp}
        />
        <KpiCard
          label="Cancelamentos"
          value={`${cancellationRate}%`}
          hint={`${report.summary.cancelled} cancelados · ${report.summary.noShow} no-show (${noShowRate}%)`}
          icon={CalendarX2}
          tone={cancellationRate >= 15 ? "negative" : "default"}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              Volume por dia
            </CardTitle>
            <CardDescription>
              Atendimentos não cancelados em cada dia do período selecionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.summary.total === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="Sem dados no período"
                description="Não há agendamentos registrados entre as datas selecionadas."
              />
            ) : (
              <ReportChart data={dailyData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="size-4 text-muted-foreground" />
              Mix de serviços
            </CardTitle>
            <CardDescription>Participação na quantidade de itens.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.byService.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum serviço no período.
              </p>
            ) : (
              report.byService.slice(0, 8).map((service) => {
                const share =
                  totalServiceCount > 0
                    ? Math.round((service.count / totalServiceCount) * 100)
                    : 0;
                return (
                  <div key={service.serviceName} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">{service.serviceName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {share}% · {formatCurrency(service.revenueCents)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${Math.max(4, share)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo por serviço</CardTitle>
          <CardDescription>
            Valores dos itens registrados no período, incluindo atendimentos em
            aberto (exceto cancelados).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {report.byService.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">
              Nenhum item de serviço encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Serviço</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Receita dos itens</TableHead>
                  <TableHead className="pr-4 text-right">Participação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byService.map((service) => (
                  <TableRow key={service.serviceName}>
                    <TableCell className="pl-4 font-medium">
                      {service.serviceName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {service.count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(service.revenueCents)}
                    </TableCell>
                    <TableCell className="pr-4 text-right text-xs text-muted-foreground tabular-nums">
                      {totalServiceCount > 0
                        ? `${Math.round((service.count / totalServiceCount) * 100)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        O CSV inclui todos os agendamentos do período, com status, pagamento e
        valores preservados. A receita realizada considera apenas o que foi
        marcado como concluído.
      </p>
    </div>
  );
}
