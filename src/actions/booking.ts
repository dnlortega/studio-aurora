"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { formDataValues, formErrorCode } from "@/lib/form-action";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import {
  BookingError,
  cancelBooking,
  createBooking,
  getAppointmentWithClient,
  rescheduleBooking,
} from "@/lib/booking/service";
import { sendAppointmentEmail } from "@/lib/booking/notify";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { requestIdentifier } from "@/lib/request";
import {
  bookingSchema,
  cancelSchema,
  changePasswordSchema,
  flattenFieldErrors,
  rescheduleSchema,
  updateProfileSchema,
} from "@/lib/validation/schemas";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, revokeAllSessions } from "@/lib/auth/session";

function handleBookingError(error: unknown): ActionResult<never> {
  if (error instanceof BookingError) {
    return fail(error.message);
  }
  console.error("[booking] erro inesperado:", error);
  return fail(
    "Não foi possível concluir a operação agora. Tente novamente em instantes.",
  );
}

export async function createBookingAction(
  input: unknown,
): Promise<ActionResult<{ id: string; day: string; startMinute: number }>> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("Sua sessão expirou. Entre novamente para concluir.");
  }

  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise os dados do agendamento.", flattenFieldErrors(parsed.error));
  }

  const identifier = await requestIdentifier();
  if (
    !rateLimit(rateLimitKey("booking", `${identifier}:${user.id}`), {
      limit: 10,
      windowMs: 10 * 60 * 1000,
    }).allowed
  ) {
    return fail("Muitas tentativas de agendamento. Aguarde alguns minutos.");
  }

  try {
    const db = await getDb();
    const appointment = await createBooking({
      db,
      actor: { id: user.id, name: user.name, role: user.role },
      clientId: user.id,
      day: parsed.data.day,
      startMinute: parsed.data.startMinute,
      serviceIds: parsed.data.serviceIds,
      notes: parsed.data.notes,
    });

    await sendAppointmentEmail(db, appointment.id, "booking_created");
    revalidatePath("/painel");
    revalidatePath("/painel/agendamentos");
    revalidatePath("/admin");
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/agendamentos");

    return ok("Agendamento confirmado.", {
      id: appointment.id,
      day: appointment.startsOn,
      startMinute: appointment.startMinute,
    });
  } catch (error) {
    return handleBookingError(error);
  }
}

export async function cancelMyAppointmentAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sua sessão expirou. Entre novamente.");

  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Não foi possível cancelar.", flattenFieldErrors(parsed.error));
  }

  try {
    const db = await getDb();
    const before = await getAppointmentWithClient(
      parsed.data.appointmentId,
      db,
    );
    if (!before) return fail("Agendamento não encontrado.");

    await cancelBooking({
      db,
      actor: { id: user.id, name: user.name, role: user.role },
      appointmentId: parsed.data.appointmentId,
      reason: parsed.data.reason,
    });

    await sendAppointmentEmail(db, parsed.data.appointmentId, "booking_cancelled");
    revalidatePath("/painel");
    revalidatePath("/painel/agendamentos");
    revalidatePath(`/painel/agendamentos/${parsed.data.appointmentId}`);
    revalidatePath("/admin");
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/agendamentos");

    return ok("Agendamento cancelado.");
  } catch (error) {
    return handleBookingError(error);
  }
}

export async function rescheduleMyAppointmentAction(
  input: unknown,
): Promise<ActionResult<{ id: string; day: string; startMinute: number }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Sua sessão expirou. Entre novamente.");

  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise os dados do novo horário.", flattenFieldErrors(parsed.error));
  }

  try {
    const db = await getDb();
    const updated = await rescheduleBooking({
      db,
      actor: { id: user.id, name: user.name, role: user.role },
      appointmentId: parsed.data.appointmentId,
      day: parsed.data.day,
      startMinute: parsed.data.startMinute,
      serviceIds: parsed.data.serviceIds,
    });

    await sendAppointmentEmail(db, updated.id, "booking_rescheduled");
    revalidatePath("/painel");
    revalidatePath("/painel/agendamentos");
    revalidatePath(`/painel/agendamentos/${updated.id}`);
    revalidatePath("/admin");
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/agendamentos");

    return ok("Agendamento reagendado.", {
      id: updated.id,
      day: updated.startsOn,
      startMinute: updated.startMinute,
    });
  } catch (error) {
    return handleBookingError(error);
  }
}

export async function updateProfileAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sua sessão expirou. Entre novamente.");

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise os dados.", flattenFieldErrors(parsed.error));
  }

  const db = await getDb();
  await db
    .update(users)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      notifyEmail: parsed.data.notifyEmail,
      notifyWhatsapp: parsed.data.notifyWhatsapp,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/painel");
  revalidatePath("/painel/perfil");
  return ok("Dados atualizados.");
}

export async function updatePasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sua sessão expirou. Entre novamente.");

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise os dados.", flattenFieldErrors(parsed.error));
  }

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!valid) {
    return fail("Senha atual incorreta.", {
      currentPassword: "Senha atual incorreta.",
    });
  }

  const db = await getDb();
  const passwordHash = await hashPassword(parsed.data.password);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await revokeAllSessions(user.id);
  await createSession(user.id);
  return ok("Senha alterada.");
}

/**
 * Versões de formulário (`<form action={...}>`) de perfil e senha. Assim dados pessoais e credenciais seguem no corpo da requisição mesmo
 * antes da hidratação do React — nunca na URL, no histórico ou nos logs.
 */
export async function updateProfileFormAction(
  formData: FormData,
): Promise<void> {
  const result = await updateProfileAction(formDataValues(formData));
  redirect(
    result.ok
      ? "/painel/perfil?salvo=1"
      : `/painel/perfil?erro=${formErrorCode(result)}`,
  );
}

export async function updatePasswordFormAction(
  formData: FormData,
): Promise<void> {
  const result = await updatePasswordAction(formDataValues(formData));
  redirect(
    result.ok
      ? "/painel/perfil?senha=1"
      : `/painel/perfil?erroSenha=${formErrorCode(result)}`,
  );
}
