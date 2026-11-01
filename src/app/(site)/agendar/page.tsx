import type { Metadata } from "next";
import { CalendarDays, CalendarX2, LogIn } from "lucide-react";

import {
  BookingWizard,
  type RescheduleInfo,
} from "@/components/booking/booking-wizard";
import { EmptyState } from "@/components/shared/empty-state";
import { IconLink } from "@/components/shared/icon-button";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientAppointmentDetail } from "@/lib/booking/queries";
import { getActiveServices } from "@/lib/booking/service";
import { addDays, getSalonNow } from "@/lib/dates";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Agendar horário",
  description:
    "Escolha os serviços, veja os horários realmente livres na agenda do Studio Aurora e confirme seu atendimento online.",
};

type BookingPageProps = {
  searchParams: Promise<{ servico?: string; reagendar?: string }>;
};

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
        icon={CalendarX2}
        title={title}
        description={description}
        action={
          <IconLink href="/painel/agendamentos" label="Ver meus agendamentos">
            <CalendarDays className="size-4" />
          </IconLink>
        }
      />
    </div>
  );
}

export default async function BookingPage({ searchParams }: BookingPageProps) {
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
              icon={LogIn}
              title="Entre para reagendar"
              description="Entre na sua conta para escolher um novo horário para este atendimento."
              action={
                <IconLink
                  href={`/entrar?next=${encodeURIComponent(
                    `/agendar?reagendar=${rescheduleId}`,
                  )}`}
                  label="Entrar na conta"
                >
                  <LogIn className="size-4" />
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
    <div className="container-page py-10 sm:py-14">
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
      />
    </div>
  );
}
