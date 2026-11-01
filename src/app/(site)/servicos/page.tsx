import type { Metadata } from "next";
import { CalendarDays, Clock3, Sparkles } from "lucide-react";

import { IconLink } from "@/components/shared/icon-button";
import { ServiceCard } from "@/components/site/service-card";
import { getActiveServices } from "@/lib/booking/service";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Serviços e preços",
  description:
    "Conheça os serviços do Studio Aurora, com preços e duração transparentes. Combine serviços e agende online.",
};

export default async function ServicesPage() {
  const [settings, services] = await Promise.all([
    getSettings(),
    getActiveServices(),
  ]);

  return (
    <div className="container-page py-12 lg:py-16">
      <div className="max-w-2xl space-y-4">
        <p className="eyebrow">Catálogo</p>
        <h1 className="text-4xl font-medium text-balance sm:text-5xl">
          Serviços que cuidam de cada detalhe
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground text-pretty">
          Todos os valores e durações já consideram o tempo real de atendimento.
          Você pode combinar até{" "}
          <strong className="font-medium text-foreground">
            {settings.maxServicesPerBooking} serviços
          </strong>{" "}
          em um mesmo horário e a agenda calcula o total para você.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <IconLink href="/agendar" label="Agendar horário" size="icon-lg">
            <CalendarDays className="size-5" />
          </IconLink>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            Confirmação imediata
          </span>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
          <Sparkles className="size-5 text-primary" />
          <p className="mt-2 font-medium">Catálogo em preparação</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Os serviços aparecerão aqui assim que forem cadastrados no painel
            administrativo.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}

      <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/15 bg-accent/30 p-6 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <p className="font-heading text-xl">Não sabe por onde começar?</p>
          <p className="text-sm text-muted-foreground">
            Agende um horário e converse com a nossa equipe antes do atendimento.
          </p>
        </div>
        <IconLink
          href="/agendar"
          label="Ver horários livres"
          variant="outline"
          tooltipSide="left"
        >
          <Clock3 className="size-4" />
        </IconLink>
      </div>
    </div>
  );
}
