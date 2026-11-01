import { Pencil, Plus, Scissors } from "lucide-react";

import {
  DeleteServiceButton,
  ServiceFormDialog,
} from "@/components/admin/service-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
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
import { getAllServices } from "@/lib/booking/service";
import { formatCurrency, formatDuration } from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";

export default async function AdminServicesPage() {
  await requireAdmin("/admin/servicos");
  const services = await getAllServices();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Serviços"
        description="Preço e duração valem para novas reservas. Nome, preço e duração usados em agendamentos antigos ficam preservados no histórico."
        actions={
          <ServiceFormDialog
            trigger={
              <Button size="icon" aria-label="Novo serviço" title="Novo serviço">
                <Plus className="size-4" />
              </Button>
            }
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent>
            <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">
              Serviços cadastrados
            </p>
            <p className="font-heading text-2xl">{services.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">
              Ativos no site
            </p>
            <p className="font-heading text-2xl">
              {services.filter((service) => service.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">
              Duração média
            </p>
            <p className="font-heading text-2xl">
              {services.length > 0
                ? formatDuration(
                    Math.round(
                      services.reduce(
                        (total, service) => total + service.durationMin,
                        0,
                      ) / services.length,
                    ),
                  )
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Nenhum serviço cadastrado"
          description="Cadastre o primeiro serviço para exibir preços e permitir agendamentos."
          action={
            <ServiceFormDialog
              trigger={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Criar serviço"
                  title="Criar serviço"
                >
                  <Plus className="size-4" />
                </Button>
              }
            />
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Catálogo atual</CardTitle>
            <CardDescription>
              Serviços inativos não aparecem na agenda pública, mas continuam no
              histórico.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Ordem</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32 pr-4 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">
                        {service.sortOrder}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{service.name}</p>
                        <p className="max-w-72 truncate text-xs text-muted-foreground">
                          {service.description ?? "Sem descrição"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatCurrency(service.priceCents)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatDuration(service.durationMin)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            service.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "text-muted-foreground",
                          )}
                        >
                          {service.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ServiceFormDialog
                            service={service}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Editar ${service.name}`}
                                title={`Editar ${service.name}`}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            }
                          />
                          <DeleteServiceButton
                            serviceId={service.id}
                            serviceName={service.name}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 px-4 md:hidden">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-lg border border-border/70 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{service.name}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {service.description ?? "Sem descrição"}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {service.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {formatCurrency(service.priceCents)} ·{" "}
                      {formatDuration(service.durationMin)}
                    </span>
                    <div className="flex gap-1">
                      <ServiceFormDialog
                        service={service}
                        trigger={
                          <Button
                            variant="outline"
                            size="icon-xs"
                            aria-label={`Editar ${service.name}`}
                            title={`Editar ${service.name}`}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        }
                      />
                      <DeleteServiceButton
                        serviceId={service.id}
                        serviceName={service.name}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Regra de integridade: se um serviço já foi usado em algum atendimento, ele
        nunca é apagado — apenas desativado. Assim relatórios, faturas e o
        histórico da cliente continuam corretos mesmo após mudanças de preço.
      </p>
    </div>
  );
}
