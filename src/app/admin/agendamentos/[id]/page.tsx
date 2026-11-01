import { ArrowLeft, CalendarPlus } from "lucide-react";
import { notFound } from "next/navigation";

import { AppointmentDetailCard } from "@/components/admin/appointment-detail";
import { IconLink } from "@/components/shared/icon-button";
import { PageHeader } from "@/components/shared/page-header";
import { getAdminAppointmentDetail } from "@/lib/booking/queries";
import { formatDayLong, getSalonNow } from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";

export default async function AdminAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/agendamentos");
  const { id } = await params;
  const [appointment, settings] = await Promise.all([
    getAdminAppointmentDetail(id),
    getSettings(),
  ]);

  if (!appointment) notFound();

  const now = getSalonNow(settings.timezone);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agendamento"
        title={appointment.clientName}
        description={`${formatDayLong(appointment.startsOn)} · ${appointment.items
          .map((item) => item.serviceName)
          .join(" + ")}`}
        actions={
          <>
            <IconLink
              href="/admin/agendamentos"
              label="Voltar à lista"
              variant="outline"
            >
              <ArrowLeft className="size-4" />
            </IconLink>
            <IconLink href="/admin/agendamentos/novo" label="Novo agendamento">
              <CalendarPlus className="size-4" />
            </IconLink>
          </>
        }
      />

      <AppointmentDetailCard
        appointment={appointment}
        timezone={settings.timezone}
        today={now.day}
      />
    </div>
  );
}
