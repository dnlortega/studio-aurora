import { Activity, RefreshCw } from "lucide-react";

import { IconLink } from "@/components/shared/icon-button";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { getSystemStatus, type StatusTone } from "@/lib/status";
import { cn } from "@/lib/utils";

export const metadata = { title: "Status do sistema" };
// Página de diagnóstico: sempre lida do servidor no momento da visita.
export const dynamic = "force-dynamic";

const toneStyles: Record<StatusTone, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-border bg-muted/40 text-muted-foreground",
};

const toneLabel: Record<StatusTone, string> = {
  ok: "tudo operacional",
  warn: "funcionando com avisos",
  error: "há um problema",
  neutral: "informativo",
};

export default async function AdminStatusPage() {
  await requireAdmin("/admin/status");
  const status = await getSystemStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Diagnóstico"
        title="Status do servidor"
        description="Conexão com o banco, ambiente de execução, versão do código publicada e chaves de integração. Nenhum segredo é exibido — as chaves aparecem apenas como configuradas ou ausentes."
        actions={
          <IconLink
            href="/admin/status"
            label="Atualizar"
            variant="outline"
            tooltipSide="left"
          >
            <RefreshCw className="size-4" />
          </IconLink>
        }
      />

      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium",
          toneStyles[status.overall],
        )}
      >
        <Activity className="size-4 shrink-0" />
        <span>
          {toneLabel[status.overall]} · verificado em{" "}
          {new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "medium",
          }).format(status.generatedAt)}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {status.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className="grid gap-1 rounded-lg border border-border/60 bg-background p-3 sm:grid-cols-[9rem_1fr]"
                >
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {item.label}
                  </dt>
                  <dd className="space-y-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
                        toneStyles[item.tone],
                      )}
                    >
                      {item.value}
                    </span>
                    {item.detail ? (
                      <p className="text-xs text-muted-foreground text-pretty">
                        {item.detail}
                      </p>
                    ) : null}
                  </dd>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Este painel é visível apenas para administradores autenticados e lê o
        estado no servidor a cada acesso.
      </p>
    </div>
  );
}
