import Link from "next/link";
import {
  Banknote,
  CalendarSearch,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

import { AppointmentDetailCard } from "@/components/admin/appointment-detail";
import { AppointmentFilters } from "@/components/admin/appointment-filters";
import { AppointmentSheet } from "@/components/admin/appointment-sheet";
import { QuickStatus } from "@/components/admin/quick-status";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { IconLink } from "@/components/shared/icon-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAdminAppointmentDetail,
  getServicesForFilter,
  searchAppointments,
} from "@/lib/booking/queries";
import {
  formatCurrency,
  formatDayLong,
  formatDayShort,
  formatMinuteRange,
  getSalonNow,
  minutesToTime,
} from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{
  status?: string;
  servico?: string;
  de?: string;
  ate?: string;
  q?: string;
  pagina?: string;
  detalhe?: string;
}>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_VALUES = new Set([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin("/admin/agendamentos");
  const params = await searchParams;
  const settings = await getSettings();
  const now = getSalonNow(settings.timezone);

  const status = params.status && STATUS_VALUES.has(params.status) ? params.status : "";
  const serviceId = params.servico ?? "";
  const from = params.de && DATE_PATTERN.test(params.de) ? params.de : "";
  const to = params.ate && DATE_PATTERN.test(params.ate) ? params.ate : "";
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.pagina) || 1);

  const [result, services] = await Promise.all([
    searchAppointments({
      from: from || undefined,
      to: to || undefined,
      status: status ? [status] : undefined,
      serviceId: serviceId || undefined,
      clientQuery: query || undefined,
      page,
      pageSize: 20,
    }),
    getServicesForFilter(),
  ]);

  const detail =
    params.detalhe && params.detalhe.length >= 32
      ? await getAdminAppointmentDetail(params.detalhe)
      : null;

  const baseParams = new URLSearchParams();
  if (status) baseParams.set("status", status);
  if (serviceId) baseParams.set("servico", serviceId);
  if (from) baseParams.set("de", from);
  if (to) baseParams.set("ate", to);
  if (query) baseParams.set("q", query);
  if (page > 1) baseParams.set("pagina", String(page));

  function detailHref(id: string) {
    const next = new URLSearchParams(baseParams);
    next.set("detalhe", id);
    return `/admin/agendamentos?${next.toString()}`;
  }

  function pageHref(target: number) {
    const next = new URLSearchParams(baseParams);
    next.delete("pagina");
    if (target > 1) next.set("pagina", String(target));
    const search = next.toString();
    return search ? `/admin/agendamentos?${search}` : "/admin/agendamentos";
  }

  const closeHref = baseParams.toString()
    ? `/admin/agendamentos?${baseParams.toString()}`
    : "/admin/agendamentos";
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agendamentos"
        title="Todos os agendamentos"
        description="Filtre por status, serviço, período ou cliente. Abra os detalhes para alterar status, registrar pagamento, reagendar ou cancelar."
        actions={
          <IconLink href="/admin/agendamentos/novo" label="Novo agendamento">
            <CalendarPlus className="size-4" />
          </IconLink>
        }
      />

      <AppointmentFilters
        initialStatus={status}
        initialService={serviceId}
        initialFrom={from}
        initialTo={to}
        initialQuery={query}
        services={services}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {result.total} agendamento{result.total === 1 ? "" : "s"} encontrado
          {result.total === 1 ? "" : "s"}
          {result.total > 0 ? (
            <>
              {" "}
              · página {result.page} de {totalPages}
            </>
          ) : null}
        </p>
        {status || serviceId || from || to || query ? (
          <p className="text-xs text-muted-foreground">
            Filtros ativos ·{" "}
            <Link href="/admin/agendamentos" className="text-primary hover:underline">
              limpar tudo
            </Link>
          </p>
        ) : null}
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={CalendarSearch}
          title="Nenhum agendamento encontrado"
          description="Ajuste os filtros ou crie um agendamento manual para uma cliente cadastrada."
          action={
            <IconLink
              href="/admin/agendamentos/novo"
              label="Novo agendamento"
              variant="outline"
              size="icon-sm"
            >
              <CalendarPlus className="size-4" />
            </IconLink>
          }
        />
      ) : (
        <>
          <Card className="hidden md:block">
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Data e horário</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviços</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16 pr-4 text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="pl-4 align-top">
                        <p className="font-medium first-letter:uppercase">
                          {formatDayShort(appointment.startsOn)}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatMinuteRange(
                            appointment.startMinute,
                            appointment.endMinute,
                          )}
                        </p>
                      </TableCell>
                      <TableCell className="align-top">
                        <Link
                          href={detailHref(appointment.id)}
                          className="font-medium hover:underline"
                        >
                          {appointment.clientName}
                        </Link>
                        <p className="max-w-44 truncate text-xs text-muted-foreground">
                          {appointment.clientEmail}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-56 align-top">
                        <p className="line-clamp-2 whitespace-normal text-xs text-muted-foreground">
                          {appointment.items
                            .map((item) => item.serviceName)
                            .join(" + ") || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="align-top text-right tabular-nums">
                        {formatCurrency(appointment.totalPriceCents)}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge
                          variant="outline"
                          className={cn(
                            appointment.paymentStatus === "paid"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "text-muted-foreground",
                          )}
                        >
                          <Banknote className="size-3" />
                          {appointment.paymentStatus === "paid" ? "Pago" : "A pagar"}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <QuickStatus
                          appointmentId={appointment.id}
                          status={appointment.status}
                          compact
                        />
                      </TableCell>
                      <TableCell className="pr-4 text-right align-top">
                        <IconLink
                          href={detailHref(appointment.id)}
                          label={`Ver detalhes de ${appointment.clientName}`}
                          variant="ghost"
                          size="icon-xs"
                        >
                          <Eye className="size-3.5" />
                        </IconLink>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-2 md:hidden">
            {result.items.map((appointment) => (
              <Card key={appointment.id} size="sm">
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium first-letter:uppercase">
                        {formatDayLong(appointment.startsOn)}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {minutesToTime(appointment.startMinute)}–
                        {minutesToTime(appointment.endMinute)}
                      </p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <div>
                    <Link
                      href={detailHref(appointment.id)}
                      className="text-sm font-medium hover:underline"
                    >
                      {appointment.clientName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {appointment.items
                        .map((item) => item.serviceName)
                        .join(" + ") || "Sem serviços"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm tabular-nums">
                      {formatCurrency(appointment.totalPriceCents)}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        appointment.paymentStatus === "paid"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "text-muted-foreground",
                      )}
                    >
                      {appointment.paymentStatus === "paid" ? "Pago" : "A pagar"}
                    </Badge>
                    <IconLink
                      href={detailHref(appointment.id)}
                      label="Detalhes"
                      variant="outline"
                      size="icon-xs"
                    >
                      <Eye className="size-3.5" />
                    </IconLink>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2">
              {result.page > 1 ? (
                <IconLink
                  href={pageHref(result.page - 1)}
                  label="Anterior"
                  variant="outline"
                  size="icon-sm"
                >
                  <ChevronLeft className="size-4" />
                </IconLink>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">
                Página {result.page} de {totalPages}
              </span>
              {result.page < totalPages ? (
                <IconLink
                  href={pageHref(result.page + 1)}
                  label="Próxima"
                  variant="outline"
                  size="icon-sm"
                  tooltipSide="left"
                >
                  <ChevronRight className="size-4" />
                </IconLink>
              ) : (
                <span />
              )}
            </div>
          ) : null}
        </>
      )}

      {detail ? (
        <AppointmentSheet
          closeHref={closeHref}
          dayLabel={formatDayLong(detail.startsOn)}
        >
          <AppointmentDetailCard
            appointment={detail}
            timezone={settings.timezone}
            today={now.day}
          />
        </AppointmentSheet>
      ) : null}

      {params.detalhe && !detail ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Agendamento não encontrado.{" "}
          <Link href={closeHref} className="underline">
            Fechar
          </Link>
        </p>
      ) : null}
    </div>
  );
}
