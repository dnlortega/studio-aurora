import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  Search,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { ClientFormDialog } from "@/components/admin/client-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { IconLink, IconSubmitButton } from "@/components/shared/icon-button";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getClients } from "@/lib/booking/queries";
import { formatCurrency, formatPhoneInput } from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{ q?: string; inativos?: string; pagina?: string }>;

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin("/admin/clientes");
  const params = await searchParams;
  const settings = await getSettings();
  const query = params.q?.trim() ?? "";
  const includeInactive = params.inativos === "1";
  const page = Math.max(1, Number(params.pagina) || 1);

  const result = await getClients({
    query: query || undefined,
    includeInactive,
    page,
    pageSize: 20,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  function pageHref(target: number) {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (includeInactive) next.set("inativos", "1");
    if (target > 1) next.set("pagina", String(target));
    const search = next.toString();
    return search ? `/admin/clientes?${search}` : "/admin/clientes";
  }

  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: settings.timezone,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clientes"
        title="Clientes do salão"
        description="Cadastre, ative ou desative contas e consulte o histórico de cada cliente. Somente o admin vê esta lista."
        actions={
          <ClientFormDialog
            trigger={
              <Button size="icon" aria-label="Nova cliente" title="Nova cliente">
                <UserPlus className="size-4" />
              </Button>
            }
          />
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <form action="/admin/clientes" method="get" className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Buscar por nome, e-mail ou telefone"
              className="pl-8"
              aria-label="Buscar cliente"
            />
          </div>
          {includeInactive ? <input type="hidden" name="inativos" value="1" /> : null}
          <IconSubmitButton
            label="Buscar"
            variant="outline"
            icon={<Search className="size-4" />}
          />
          {query ? (
            <Link
              href={includeInactive ? "/admin/clientes?inativos=1" : "/admin/clientes"}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              limpar
            </Link>
          ) : null}
        </form>

        <IconLink
          href={
            includeInactive
              ? `/admin/clientes${query ? `?q=${encodeURIComponent(query)}` : ""}`
              : `/admin/clientes?inativos=1${query ? `&q=${encodeURIComponent(query)}` : ""}`
          }
          label={includeInactive ? "Ocultar inativas" : "Mostrar inativas"}
          variant={includeInactive ? "secondary" : "outline"}
          size="icon-sm"
        >
          {includeInactive ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </IconLink>
      </div>

      <p className="text-sm text-muted-foreground">
        {result.total} cliente{result.total === 1 ? "" : "s"}
        {result.total > 0 ? ` · página ${result.page} de ${totalPages}` : ""}
      </p>

      {result.items.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Nenhuma cliente encontrada"
          description={
            query
              ? "Revise a busca ou inclua contas inativas."
              : "Cadastre a primeira cliente para começar a usar a agenda."
          }
          action={
            query ? (
              <IconLink
                href="/admin/clientes"
                label="Limpar busca"
                variant="outline"
                size="icon-sm"
              >
                <X className="size-4" />
              </IconLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <Card className="hidden md:block">
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead className="text-center">Agendamentos</TableHead>
                    <TableHead className="text-right">Total gasto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24 pr-4 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="pl-4">
                        <Link
                          href={`/admin/clientes/${client.id}`}
                          className="font-medium hover:underline"
                        >
                          {client.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {client.phone ? formatPhoneInput(client.phone) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {dateFormatter.format(client.createdAt)}
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">
                        {client.appointmentsCount}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({client.completedCount} concl.)
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatCurrency(client.totalSpentCents)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            client.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "text-muted-foreground",
                          )}
                        >
                          {client.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="flex justify-end gap-1">
                          <IconLink
                            href={`/admin/clientes/${client.id}`}
                            label="Ver ficha"
                            variant="ghost"
                            size="icon-xs"
                          >
                            <UserRound className="size-3.5" />
                          </IconLink>
                          <ClientFormDialog
                            client={client}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Editar ${client.name}`}
                                title={`Editar ${client.name}`}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-2 md:hidden">
            {result.items.map((client) => (
              <Card key={client.id} size="sm">
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/clientes/${client.id}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {client.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {client.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {client.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{client.phone ? formatPhoneInput(client.phone) : "Sem telefone"}</span>
                    <span>
                      {client.appointmentsCount} agend. ·{" "}
                      {formatCurrency(client.totalSpentCents)}
                    </span>
                  </div>
                  <div className="flex justify-end gap-1">
                    <IconLink
                      href={`/admin/clientes/${client.id}`}
                      label="Ficha"
                      variant="outline"
                      size="icon-xs"
                    >
                      <UserRound className="size-3.5" />
                    </IconLink>
                    <ClientFormDialog
                      client={client}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Editar ${client.name}`}
                          title={`Editar ${client.name}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between">
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
    </div>
  );
}
