import {
  Clock3,
  History,
  Info,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  SettingsForm,
  type SettingsFormValues,
} from "@/components/admin/settings-form";
import { IconLink } from "@/components/shared/icon-button";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRecentAuditLogs } from "@/lib/booking/queries";
import { formatDateTime, formatFullDate, getSalonNow } from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";

const AUDIT_LABELS: Record<string, string> = {
  "service.create": "Serviço criado",
  "service.update": "Serviço atualizado",
  "service.delete": "Serviço excluído",
  "service.deactivate": "Serviço desativado",
  "hours.update": "Horários atualizados",
  "block.create": "Bloqueio criado",
  "block.delete": "Bloqueio removido",
  "settings.update": "Configurações atualizadas",
  "client.create": "Cliente cadastrada",
  "client.update": "Cliente atualizada",
  "booking.create": "Agendamento criado",
  "booking.reschedule": "Agendamento remarcado",
  "booking.cancel": "Agendamento cancelado",
  "booking.status": "Status alterado",
  "booking.payment": "Pagamento atualizado",
};

export default async function AdminSettingsPage() {
  await requireAdmin("/admin/configuracoes");
  const [settings, logs] = await Promise.all([
    getSettings(),
    getRecentAuditLogs(10),
  ]);
  const now = getSalonNow(settings.timezone);

  const initial: SettingsFormValues = {
    salonName: settings.salonName,
    tagline: settings.tagline,
    description: settings.description ?? "",
    address: settings.address ?? "",
    phone: settings.phone ?? "",
    whatsapp: settings.whatsapp ?? "",
    email: settings.email ?? "",
    instagram: settings.instagram ?? "",
    timezone: settings.timezone,
    slotGranularityMin: String(settings.slotGranularityMin),
    minLeadMinutes: String(settings.minLeadMinutes),
    maxLeadDays: String(settings.maxLeadDays),
    cancelMinHours: String(settings.cancelMinHours),
    rescheduleMinHours: String(settings.rescheduleMinHours),
    maxServicesPerBooking: String(settings.maxServicesPerBooking),
    autoConfirm: settings.autoConfirm,
    publicNotice: settings.publicNotice ?? "",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configurações"
        title="Configurações do salão"
        description="Identidade, contato e regras que controlam a agenda pública e as validações do servidor."
        actions={
          <IconLink
            href="/admin/horarios"
            label="Horários de funcionamento"
            variant="outline"
          >
            <Clock3 className="size-4" />
          </IconLink>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <SettingsForm initial={initial} />

        <div className="space-y-4 xl:sticky xl:top-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-muted-foreground" />
                Resumo operacional
              </CardTitle>
              <CardDescription>
                Como a agenda está configurada neste momento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs leading-relaxed">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Hoje no salão</span>
                <span className="text-right font-medium first-letter:uppercase">
                  {formatFullDate(now.day)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Fuso horário</span>
                <span className="text-right font-medium">
                  {settings.timezone.replaceAll("_", " ")}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Grade de horários</span>
                <span className="text-right font-medium">
                  a cada {settings.slotGranularityMin} min
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Antecedência mínima</span>
                <span className="text-right font-medium">
                  {settings.minLeadMinutes} min
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Agenda aberta</span>
                <span className="text-right font-medium">
                  {settings.maxLeadDays} dias
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Confirmação</span>
                <Badge variant={settings.autoConfirm ? "secondary" : "outline"}>
                  {settings.autoConfirm ? "Automática" : "Manual"}
                </Badge>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-border/70 pt-2">
                <span className="text-muted-foreground">Última alteração</span>
                <span className="text-right font-medium">
                  {formatDateTime(settings.updatedAt, settings.timezone)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <History className="size-4 text-muted-foreground" />
                Últimas ações administrativas
              </CardTitle>
              <CardDescription>
                Registro das alterações feitas no painel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma ação registrada ainda.
                </p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="space-y-0.5">
                    <p className="text-xs font-medium">
                      {AUDIT_LABELS[log.action] ?? log.action}
                    </p>
                    {log.details ? (
                      <p className="truncate text-[0.7rem] text-muted-foreground">
                        {log.details}
                      </p>
                    ) : null}
                    <p className="text-[0.65rem] text-muted-foreground/80">
                      {log.actorName ?? "Sistema"} ·{" "}
                      {formatDateTime(log.createdAt, settings.timezone)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="size-4 text-muted-foreground" />
                Perfis e segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <p>
                O cadastro público cria sempre contas de cliente. O perfil
                administrativo só é concedido fora do site, por processo seguro
                no servidor.
              </p>
              <p>
                Toda consulta de cliente é filtrada pelo dono do agendamento no
                servidor; o painel administrativo exige sessão com perfil admin
                em cada rota e ação.
              </p>
            </CardContent>
          </Card>

          <p className="flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3 shrink-0" />
            E-mail de confirmação só é enviado quando o envio está configurado
            no servidor. Sem essa configuração, o agendamento continua válido e
            o aviso de pendência aparece para a equipe.
          </p>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Save className="size-3.5" />
        As configurações são gravadas no banco e reaplicadas em todas as telas.
      </p>
    </div>
  );
}
