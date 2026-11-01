import Link from "next/link";
import {
  ArrowLeft,
  CalendarPlus,
  Eye,
  Mail,
  Pencil,
  Phone,
  ReceiptText,
} from "lucide-react";
import { notFound } from "next/navigation";

import { ClientFormDialog } from "@/components/admin/client-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { IconLink } from "@/components/shared/icon-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getClientAppointments,
  getClientById,
  getClientStats,
} from "@/lib/booking/queries";
import {
  formatCurrency,
  formatDateTime,
  formatMinuteRange,
  formatPhoneInput,
} from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export default async function AdminClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/clientes");
  const { id } = await params;
  const [client, settings] = await Promise.all([getClientById(id), getSettings()]);
  if (!client) notFound();

  const [stats, appointments] = await Promise.all([
    getClientStats(client.id),
    getClientAppointments(client.id, { limit: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ficha da cliente"
        title={client.name}
        description={`${client.email} · cliente desde ${new Intl.DateTimeFormat(
          "pt-BR",
          { dateStyle: "long", timeZone: settings.timezone },
        ).format(client.createdAt)}`}
        actions={
          <>
            <IconLink href="/admin/clientes" label="Voltar" variant="outline">
              <ArrowLeft className="size-4" />
            </IconLink>
            <IconLink
              href={`/admin/agendamentos/novo?cliente=${client.id}`}
              label="Agendar"
              variant="outline"
            >
              <CalendarPlus className="size-4" />
            </IconLink>
            <ClientFormDialog
              client={client}
              trigger={
                <Button size="icon" aria-label="Editar" title="Editar">
                  <Pencil className="size-4" />
                </Button>
              }
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card size="sm">
          <CardContent>
            <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">
              Agendamentos
            </p>
            <p className="font-heading text-2xl">{stats.appointmentsCount}</p>
            <p className="text-xs text-muted-foreground">
              {stats.completedCount} concluídos
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">
              Total gasto
            </p>
            <p className="font-heading text-2xl">
              {formatCurrency(stats.totalSpentCents)}
            </p>
            <p className="text-xs text-muted-foreground">atendimentos concluídos</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">
              Cancelamentos
            </p>
            <p className="font-heading text-2xl">{stats.cancelledCount}</p>
            <p className="text-xs text-muted-foreground">
              {stats.noShowCount} não compareceu
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">
              Última visita
            </p>
            <p className="font-heading text-2xl">
              {stats.lastVisit
                ? new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    timeZone: "UTC",
                  }).format(new Date(`${stats.lastVisit}T12:00:00.000Z`))
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.lastVisit ? "atendimento concluído" : "sem atendimentos"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Contato e acesso</CardTitle>
            <CardDescription>
              <Badge
                variant="outline"
                className={cn(
                  client.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "text-muted-foreground",
                )}
              >
                {client.isActive ? "Conta ativa" : "Conta inativa"}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <a href={`mailto:${client.email}`} className="truncate hover:underline">
                {client.email}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              {client.phone ? (
                <a href={`tel:${client.phone}`} className="hover:underline">
                  {formatPhoneInput(client.phone)}
                </a>
              ) : (
                <span className="text-muted-foreground">Telefone não informado</span>
              )}
            </p>
            <div className="border-t border-border/70 pt-3 text-xs text-muted-foreground">
              <p>
                Preferências:{" "}
                {[
                  client.notifyEmail ? "e-mail" : null,
                  client.notifyWhatsapp ? "WhatsApp" : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "sem notificações"}
              </p>
              <p className="mt-1">
                Cadastro: {formatDateTime(client.createdAt, settings.timezone)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de agendamentos</CardTitle>
            <CardDescription>
              Últimos 50 registros desta cliente, com valores e status atuais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="Sem agendamentos"
                description="Esta cliente ainda não reservou nenhum atendimento."
                action={
                  <IconLink
                    href={`/admin/agendamentos/novo?cliente=${client.id}`}
                    label="Criar agendamento"
                    variant="outline"
                    size="icon-sm"
                  >
                    <CalendarPlus className="size-4" />
                  </IconLink>
                }
              />
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-0">Data</TableHead>
                        <TableHead>Serviços</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12 text-right" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell className="pl-0">
                            <p className="text-sm first-letter:uppercase">
                              {new Intl.DateTimeFormat("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                timeZone: "UTC",
                              }).format(new Date(`${appointment.startsOn}T12:00:00.000Z`))}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {formatMinuteRange(
                                appointment.startMinute,
                                appointment.endMinute,
                              )}
                            </p>
                          </TableCell>
                          <TableCell className="max-w-56">
                            <p className="line-clamp-2 whitespace-normal text-xs text-muted-foreground">
                              {appointment.items
                                .map((item) => item.serviceName)
                                .join(" + ")}
                            </p>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {formatCurrency(appointment.totalPriceCents)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {appointment.paymentStatus === "paid" ? "Pago" : "A pagar"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={appointment.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <IconLink
                              href={`/admin/agendamentos/${appointment.id}`}
                              label="Ver"
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
                </div>

                <div className="space-y-2 sm:hidden">
                  {appointments.map((appointment) => (
                    <Link
                      key={appointment.id}
                      href={`/admin/agendamentos/${appointment.id}`}
                      className="block rounded-lg border border-border/70 p-2.5 text-sm transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="first-letter:uppercase">
                          {new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            timeZone: "UTC",
                          }).format(new Date(`${appointment.startsOn}T12:00:00.000Z`))}{" "}
                          · {formatMinuteRange(appointment.startMinute, appointment.endMinute)}
                        </span>
                        <StatusBadge status={appointment.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {appointment.items.map((item) => item.serviceName).join(" + ")}
                      </p>
                      <p className="mt-1 text-xs font-medium tabular-nums">
                        {formatCurrency(appointment.totalPriceCents)}
                      </p>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
