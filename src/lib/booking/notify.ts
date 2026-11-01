import { eq } from "drizzle-orm";

import type { AppDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  getAppointmentItems,
  getAppointmentWithClient,
} from "@/lib/booking/service";
import {
  formatCurrency,
  formatDayLong,
  formatMinuteRange,
} from "@/lib/dates";
import {
  bookingEmailTemplate,
  notifyAppointmentEvent,
  type NotificationType,
} from "@/lib/notifications";
import { getSettings } from "@/lib/settings";

/**
 * Envia (ou registra) o e-mail do evento. Nunca lança: falha de notificação
 * não pode desfazer um agendamento já gravado.
 */
export async function sendAppointmentEmail(
  db: AppDb,
  appointmentId: string,
  type: NotificationType,
): Promise<void> {
  try {
    const [appointment, items, settings] = await Promise.all([
      getAppointmentWithClient(appointmentId, db),
      getAppointmentItems(appointmentId, db),
      getSettings(db),
    ]);
    if (!appointment) return;

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, appointment.clientId))
      .limit(1);
    const client = rows[0];
    if (!client) return;

    const titles: Record<NotificationType, string> = {
      booking_created:
        appointment.status === "confirmed"
          ? "Agendamento confirmado"
          : "Agendamento recebido",
      booking_confirmed: "Agendamento confirmado",
      booking_cancelled: "Agendamento cancelado",
      booking_rescheduled: "Agendamento alterado",
      reminder: "Lembrete do seu agendamento",
    };

    const subject = `${titles[type]} — ${settings.salonName}`;
    const summary = `${titles[type]} para ${formatDayLong(
      appointment.startsOn,
    )}, ${formatMinuteRange(appointment.startMinute, appointment.endMinute)}.`;
    const footer =
      type === "booking_cancelled"
        ? "Se precisar de um novo horário, agende pelo nosso site."
        : `Cancelamentos pelo site são permitidos até ${settings.cancelMinHours}h antes do horário.`;

    const html = bookingEmailTemplate({
      salonName: settings.salonName,
      clientName: client.name,
      title: titles[type],
      dateLabel: formatDayLong(appointment.startsOn),
      timeLabel: formatMinuteRange(
        appointment.startMinute,
        appointment.endMinute,
      ),
      services: items.map(
        (item) =>
          `${item.serviceName} — ${formatCurrency(item.priceCents)} (${item.durationMin} min)`,
      ),
      priceLabel: formatCurrency(appointment.totalPriceCents),
      footer,
    });

    await notifyAppointmentEvent({
      db,
      user: {
        id: client.id,
        name: client.name,
        email: client.email,
        notifyEmail: client.notifyEmail,
        notifyWhatsapp: client.notifyWhatsapp,
      },
      appointmentId,
      type,
      subject,
      summary,
      html,
    });
  } catch (error) {
    console.error("[notifications] falha ao registrar notificação:", error);
  }
}
