import type { Metadata } from "next";
import {
  CalendarClock,
  Clock3,
  Layers,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import {
  BookingWizard,
  type RescheduleInfo,
} from "@/components/booking/booking-wizard";
import { EmptyState } from "@/components/shared/empty-state";
import { IconLink } from "@/components/shared/icon-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientAppointmentDetail } from "@/lib/booking/queries";
import { getActiveServices } from "@/lib/booking/service";
import { addDays, getSalonNow, minutesToTime, weekdayShort } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { businessHours, type Settings } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";

export type BookingSearchParams = Promise<{
  servico?: string;
  reagendar?: string;
}>;

type SettingsData = Awaited<ReturnType<typeof getSettings>>;

function BookingHeading({
  salonName,
  heading,
  description,
  settings,
}: {
  salonName: string;
  heading: string;
  description: string;
  settings: SettingsData;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-secondary via-background to-accent/25 px-5 py-7 sm:px-8 sm:py-9">
      <div className="hero-noise pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative space-y-3">
        <p className="eyebrow">{salonName}</p>
        <h1 className="max-w-2xl font-heading text-[1.7rem] leading-tight text-balance sm:text-4xl">
          {heading}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty sm:text-[0.95rem]">
          {description}
        </p>
        <ul className="flex flex-wrap gap-2 pt-1">
          <li>
            <Badge variant="outline" className="gap-1.5 bg-background/70 py-1 text-xs">
              <Layers className="size-3.5 text-primary" />
              Até {settings.maxServicesPerBooking} serviços por horário
            </Badge>
          </li>
          <li>
            <Badge variant="outline" className="gap-1.5 bg-background/70 py-1 text-xs">
              <CalendarClock className="size-3.5 text-primary" />
              Confirmação na hora
            </Badge>
          </li>
          <li>
            <Badge variant="outline" className="gap-1.5 bg-background/70 py-1 text-xs">
              <ShieldCheck className="size-3.5 text-primary" />
              Cancelamento até {settings.cancelMinHours}h antes
            </Badge>
          </li>
        </ul>
      </div>
    </section>
  );
}

function InvalidReschedule({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-6 py-6">
      <EmptyState
        icon={Clock3}
        title={title}
        description={description}
        action={
          <IconLink href="/painel/agendamentos" label="Ver meus agendamentos">
            <Clock3 className="size-4" />
          </IconLink>
        }
      />
    </div>
  );
}

/**
 * Coluna lateral do agendamento: expediente real (lido do Neon a cada
 * requisição), endereço, WhatsApp e o aviso que o salão definir nas
 * configurações.
 */
function SalonAside({
  settings,
}: {
  settings: SettingsData;
}) {
  return (
    <Card size="sm" className="overflow-hidden border-border/80 bg-card/80">
      <CardHeader className="border-b border-border/60 bg-secondary/40 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Clock3 className="size-4 text-primary" />
          {settings.salonName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5 p-4 text-sm">
        <BusinessHours timezone={settings.timezone} />

        {settings.address ? (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <span>{settings.address}</span>
          </p>
        ) : null}

        {settings.whatsapp ? (
          <WhatsAppButton whatsapp={settings.whatsapp} />
        ) : null}

        {settings.publicNotice ? (
          <p className="border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
            {settings.publicNotice}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

async function BusinessHours({ timezone }: { timezone: Settings["timezone"] }) {
  const db = await getDb();
  const hours = await db.select().from(businessHours);
  const openDays = hours
    .filter((day) => day.isOpen)
    .sort((a, b) => a.weekday - b.weekday);

  if (openDays.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        A agenda está fechada nos próximos dias. Fale com o salão pelo WhatsApp
        para combinarmos um horário.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
        Expediente
      </p>
      <ul className="space-y-1">
        {openDays.map((day) => (
          <li
            key={day.weekday}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="text-muted-foreground">{weekdayShort(day.weekday)}</span>
            <span className="tabular-nums font-medium">
              {minutesToTime(day.openMinute)}–{minutesToTime(day.closeMinute)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[0.68rem] text-muted-foreground">
        Fuso {timezone.replaceAll("_", " ")}.
      </p>
    </div>
  );
}

function WhatsAppButton({ whatsapp }: { whatsapp: string }) {
  const digits = whatsapp.replace(/\D/g, "");
  const full = digits.startsWith("55") ? digits : `55${digits}`;

  return (
    <a
      href={`https://wa.me/${full}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary"
    >
      <MessageCircle className="size-3.5" />
      Falar no WhatsApp
    </a>
  );
}

/**
 * Tela de agendamento — a página inicial do sistema.
 *
 * Não existe landing page: quem abre o site já escolhe os serviços, vê os
 * horários realmente livres e confirma. `/` e o atalho `/agendar` renderizam
 * esta mesma tela.
 */
export async function BookingScreen({
  searchParams,
  heading = "Reserve seu horário",
  description = "Escolha os serviços, veja a duração e o preço, e confirme no horário livre que ficar melhor para você.",
}: {
  searchParams: BookingSearchParams;
  heading?: string;
  description?: string;
}) {
  const params = await searchParams;
  const [settings, services, user] = await Promise.all([
    getSettings(),
    getActiveServices(),
    getCurrentUser(),
  ]);

  const now = getSalonNow(settings.timezone);
  const today = now.day;
  const maxDay = addDays(today, settings.maxLeadDays);
  const rescheduleId = params.reagendar?.trim();

  let reschedule: RescheduleInfo | undefined;

  if (rescheduleId) {
    if (!user) {
      return (
        <div className="container-page py-10 sm:py-14">
          <div className="mx-auto max-w-lg space-y-6">
            <EmptyState
              icon={Clock3}
              title="Entre para reagendar"
              description="Entre na sua conta para escolher um novo horário para este atendimento."
              action={
                <IconLink
                  href={`/entrar?next=${encodeURIComponent(
                    `/?reagendar=${rescheduleId}`,
                  )}`}
                  label="Entrar na conta"
                >
                  <Clock3 className="size-4" />
                </IconLink>
              }
            />
          </div>
        </div>
      );
    }

    // A consulta já filtra pelo clientId: agendamentos de terceiros retornam null.
    const appointment = await getClientAppointmentDetail(rescheduleId, user.id);

    if (!appointment) {
      return (
        <div className="container-page py-10 sm:py-14">
          <InvalidReschedule
            title="Agendamento não encontrado"
            description="Ele pode ter sido removido ou não pertence à sua conta. Consulte seus agendamentos para continuar."
          />
        </div>
      );
    }

    const isActive =
      appointment.status === "pending" || appointment.status === "confirmed";
    const isFuture =
      appointment.startsOn > now.day ||
      (appointment.startsOn === now.day && appointment.endMinute > now.minute);

    if (!isActive || !isFuture) {
      return (
        <div className="container-page py-10 sm:py-14">
          <InvalidReschedule
            title="Este atendimento não pode ser reagendado"
            description="Somente agendamentos futuros com status pendente ou confirmado podem receber um novo horário pelo site."
          />
        </div>
      );
    }

    const serviceIds = appointment.items
      .map((item) => item.serviceId)
      .filter((id): id is string => Boolean(id));

    if (serviceIds.length !== appointment.items.length) {
      return (
        <div className="container-page py-10 sm:py-14">
          <InvalidReschedule
            title="Reagendamento indisponível"
            description="Um dos serviços deste atendimento saiu do catálogo. Fale com o salão para ajustar a reserva."
          />
        </div>
      );
    }

    reschedule = {
      id: appointment.id,
      day: appointment.startsOn,
      startMinute: appointment.startMinute,
      endMinute: appointment.endMinute,
      serviceIds,
      serviceNames: appointment.items.map((item) => item.serviceName),
      durationMin: appointment.totalDurationMin,
      priceCents: appointment.totalPriceCents,
    };
  }

  const requestedSlugs = (params.servico ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
  const initialServiceIds = requestedSlugs
    .map((slug) => services.find((service) => service.slug === slug)?.id)
    .filter((id): id is string => Boolean(id));

  return (
    <div className="container-page space-y-7 py-7 sm:space-y-9 sm:py-10">
      <BookingHeading
        salonName={settings.salonName}
        heading={reschedule ? "Escolha o novo horário" : heading}
        description={
          reschedule
            ? "Os serviços continuam os mesmos. Escolha uma nova data e um horário livre que caiba na sua rotina."
            : description
        }
        settings={settings}
      />

      <BookingWizard
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          slug: service.slug,
          description: service.description,
          priceCents: service.priceCents,
          durationMin: service.durationMin,
        }))}
        maxServices={settings.maxServicesPerBooking}
        cancelMinHours={settings.cancelMinHours}
        timezone={settings.timezone}
        today={today}
        maxDay={maxDay}
        user={user ? { name: user.name, email: user.email } : null}
        initialServiceIds={initialServiceIds}
        reschedule={reschedule}
      >
        <SalonAside settings={settings} />
      </BookingWizard>
    </div>
  );
}

export const bookingMetadata: Metadata = {
  title: "Agendar horário",
  description:
    "Escolha os serviços, veja os horários realmente livres na agenda e confirme seu atendimento online.",
};
