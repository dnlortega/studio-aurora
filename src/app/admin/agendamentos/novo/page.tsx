import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminBookingForm } from "@/components/admin/admin-booking-form";
import { IconLink } from "@/components/shared/icon-button";
import { PageHeader } from "@/components/shared/page-header";
import { getActiveServices } from "@/lib/booking/service";
import { getActiveClientsForSelect } from "@/lib/booking/queries";
import { addDays, getSalonNow } from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";

type SearchParams = Promise<{ data?: string; cliente?: string }>;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminNewAppointmentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin("/admin/agendamentos/novo");
  const params = await searchParams;
  const [clients, services, settings] = await Promise.all([
    getActiveClientsForSelect(),
    getActiveServices(),
    getSettings(),
  ]);

  const now = getSalonNow(settings.timezone);
  const maxDay = addDays(now.day, settings.maxLeadDays);
  const requestedDay =
    params.data && DATE_PATTERN.test(params.data) ? params.data : now.day;
  const defaultDay =
    requestedDay >= now.day && requestedDay <= maxDay ? requestedDay : now.day;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agendamento manual"
        title="Agendar para uma cliente"
        description="O horário é validado no servidor com as mesmas regras da agenda pública e fica confirmado imediatamente."
        actions={
          <IconLink
            href="/admin/agendamentos"
            label="Voltar aos agendamentos"
            variant="outline"
          >
            <ArrowLeft className="size-4" />
          </IconLink>
        }
      />

      {clients.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Ainda não há clientes ativas. Cadastre uma cliente para poder criar
          agendamentos.{" "}
          <Link href="/admin/clientes" className="font-medium underline">
            Ir para Clientes
          </Link>
        </div>
      ) : null}

      <AdminBookingForm
        clients={clients}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          priceCents: service.priceCents,
          durationMin: service.durationMin,
        }))}
        maxServices={settings.maxServicesPerBooking}
        today={now.day}
        maxDay={maxDay}
        defaultDay={defaultDay}
        defaultClientId={params.cliente}
        timezone={settings.timezone}
      />
    </div>
  );
}
