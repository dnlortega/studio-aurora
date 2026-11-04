import type { AppDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

export type NotificationType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "reminder";

type NotifyInput = {
  db: AppDb;
  user: {
    id: string;
    name: string;
    email: string;
    notifyEmail: boolean;
    notifyWhatsapp: boolean;
  };
  appointmentId: string;
  type: NotificationType;
  subject: string;
  summary: string;
  html: string;
};

/**
 * Registra e tenta entregar a notificação do evento.
 *
 * - E-mail: enviado se RESEND_API_KEY estiver configurada.
 * - WhatsApp: canal automático ainda não integrado; fica registrado como
 *   `not_configured` (nunca marcamos como enviado algo que não saiu). O
 *   lembrete que o admin dispara na "Sua agenda" é manual — abre um link wa.me
 *   com a mensagem pronta (`src/lib/booking/reminder.ts`) e não passa por aqui.
 *
 * Falhas de notificação jamais desfazem a reserva já confirmada.
 */
export async function notifyAppointmentEvent(input: NotifyInput) {
  const { db, user, appointmentId, type, subject, summary, html } = input;
  const payload = JSON.stringify({ summary, subject });

  if (user.notifyEmail) {
    const result = await sendEmail({
      to: user.email,
      subject,
      html,
      text: summary,
    });

    await db.insert(notifications).values({
      userId: user.id,
      appointmentId,
      channel: "email",
      type,
      status: result.status === "sent" ? "sent" : result.status,
      payload,
      error: result.status === "failed" ? result.error : null,
      sentAt: result.status === "sent" ? new Date() : null,
    });
  }

  if (user.notifyWhatsapp) {
    await db.insert(notifications).values({
      userId: user.id,
      appointmentId,
      channel: "whatsapp",
      type,
      status: "not_configured",
      payload,
      error: "Integração de WhatsApp não configurada.",
    });
  }
}

export function bookingEmailTemplate(input: {
  salonName: string;
  clientName: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  services: string[];
  priceLabel: string;
  footer?: string;
}): string {
  const services = input.services
    .map((service) => `<li style="margin:4px 0">${service}</li>`)
    .join("");

  return `
  <div style="font-family:Georgia,serif;background:#f7f2ea;padding:32px;color:#2c2621">
    <div style="max-width:520px;margin:0 auto;background:#fffdf9;border:1px solid #e8dfd2;border-radius:16px;padding:32px">
      <p style="letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:#9a7b5f;margin:0 0 8px">${input.salonName}</p>
      <h1 style="font-size:24px;margin:0 0 16px">${input.title}</h1>
      <p style="margin:0 0 20px">Olá, ${input.clientName}. Segue o resumo do seu agendamento:</p>
      <p style="margin:0"><strong>Data:</strong> ${input.dateLabel}</p>
      <p style="margin:4px 0 16px"><strong>Horário:</strong> ${input.timeLabel}</p>
      <ul style="padding-left:18px;margin:0 0 16px">${services}</ul>
      <p style="margin:0 0 20px"><strong>Total estimado:</strong> ${input.priceLabel}</p>
      ${input.footer ? `<p style="font-size:13px;color:#6b5f55;margin:0">${input.footer}</p>` : ""}
    </div>
  </div>`;
}
