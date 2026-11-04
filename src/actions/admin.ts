"use server";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import {
  appointments,
  businessHours,
  scheduleBlocks,
  services,
  settings,
  users,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { checkPasswordStrength, hashPassword } from "@/lib/auth/password";
import { revokeAllSessions } from "@/lib/auth/session";
import {
  BookingError,
  cancelBooking,
  changeAppointmentStatus,
  createBooking,
  rescheduleBooking,
  setPaymentStatus,
} from "@/lib/booking/service";
import { sendAppointmentEmail } from "@/lib/booking/notify";
import { logAdminAction } from "@/lib/audit";
import { isValidTimeZone, timeToMinutes } from "@/lib/dates";
import {
  adminBookingSchema,
  adminClientSchema,
  blockSchema,
  businessHoursSchema,
  flattenFieldErrors,
  paymentSchema,
  rescheduleSchema,
  serviceSchema,
  settingsSchema,
  statusSchema,
} from "@/lib/validation/schemas";

async function requireAdminForAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof BookingError) return fail(error.message);
  console.error("[admin] erro inesperado:", error);
  return fail("Não foi possível concluir a operação. Tente novamente.");
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function uniqueSlug(name: string, ignoreId?: string) {
  const db = await getDb();
  const base = slugify(name) || "servico";
  let candidate = base;
  let counter = 2;

  // Consulta curta e determinística: poucos serviços por salão.
  for (;;) {
    const rows = await db
      .select({ id: services.id })
      .from(services)
      .where(
        ignoreId
          ? and(eq(services.slug, candidate), ne(services.id, ignoreId))
          : eq(services.slug, candidate),
      )
      .limit(1);
    if (!rows[0]) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/servicos");
  revalidatePath("/admin");
  revalidatePath("/admin/servicos");
  revalidatePath("/admin/agenda");
}

export async function saveServiceAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise os dados do serviço.", flattenFieldErrors(parsed.error));
  }

  const db = await getDb();
  const data = parsed.data;
  const slug = await uniqueSlug(data.name, data.id);

  try {
    if (data.id) {
      const [updated] = await db
        .update(services)
        .set({
          name: data.name,
          slug,
          description: data.description || null,
          priceCents: Math.round(data.price * 100),
          durationMin: data.durationMin,
          imageUrl: data.imageUrl || null,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(services.id, data.id))
        .returning({ id: services.id });

      if (!updated) return fail("Serviço não encontrado.");

      await logAdminAction(db, {
        actorId: admin.id,
        action: "service.update",
        entity: "service",
        entityId: data.id,
        details: data.name,
      });
      revalidateCatalog();
      return ok("Serviço atualizado.", { id: updated.id });
    }

    const [created] = await db
      .insert(services)
      .values({
        name: data.name,
        slug,
        description: data.description || null,
        priceCents: Math.round(data.price * 100),
        durationMin: data.durationMin,
        imageUrl: data.imageUrl || null,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      })
      .returning({ id: services.id });

    await logAdminAction(db, {
      actorId: admin.id,
      action: "service.create",
      entity: "service",
      entityId: created.id,
      details: data.name,
    });
    revalidateCatalog();
    return ok("Serviço criado.", { id: created.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteServiceAction(
  id: string,
): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const db = await getDb();

  // Exclusão definitiva. Os itens de agendamentos antigos guardam nome, preço
  // e duração em snapshot; a FK de appointment_items.service_id usa
  // ON DELETE SET NULL, então o histórico continua íntegro.
  const deleted = await db
    .delete(services)
    .where(eq(services.id, id))
    .returning({ name: services.name });

  if (!deleted[0]) {
    return fail("Serviço não encontrado. Atualize a página e tente novamente.");
  }

  await logAdminAction(db, {
    actorId: admin.id,
    action: "service.delete",
    entity: "service",
    entityId: id,
    details: `${deleted[0].name} (excluído permanentemente; histórico preservado em snapshots)`,
  });
  revalidateCatalog();
  return ok("Serviço excluído do banco de dados.");
}

export async function updateBusinessHoursAction(
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const parsed = businessHoursSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise os horários.", flattenFieldErrors(parsed.error));
  }

  for (const day of parsed.data) {
    if (!day.isOpen) continue;
    const open = timeToMinutes(day.open);
    const close = timeToMinutes(day.close);
    if (open === null || close === null || close <= open) {
      return fail("Horários de abertura e fechamento inválidos.");
    }

    if (day.breakStart && day.breakEnd) {
      const breakStart = timeToMinutes(day.breakStart);
      const breakEnd = timeToMinutes(day.breakEnd);
      if (
        breakStart === null ||
        breakEnd === null ||
        breakEnd <= breakStart ||
        breakStart < open ||
        breakEnd > close
      ) {
        return fail("O intervalo deve estar dentro do expediente.");
      }
    }
  }

  const db = await getDb();
  for (const day of parsed.data) {
    const open = timeToMinutes(day.open) ?? 540;
    const close = timeToMinutes(day.close) ?? 1140;
    const breakStart = day.breakStart ? timeToMinutes(day.breakStart) : null;
    const breakEnd = day.breakEnd ? timeToMinutes(day.breakEnd) : null;

    await db
      .insert(businessHours)
      .values({
        weekday: day.weekday,
        isOpen: day.isOpen,
        openMinute: open,
        closeMinute: close,
        breakStartMinute: day.isOpen ? breakStart : null,
        breakEndMinute: day.isOpen ? breakEnd : null,
      })
      .onConflictDoUpdate({
        target: businessHours.weekday,
        set: {
          isOpen: day.isOpen,
          openMinute: open,
          closeMinute: close,
          breakStartMinute: day.isOpen ? breakStart : null,
          breakEndMinute: day.isOpen ? breakEnd : null,
        },
      });
  }

  await logAdminAction(db, {
    actorId: admin.id,
    action: "hours.update",
    entity: "business_hours",
  });

  revalidatePath("/admin/horarios");
  revalidatePath("/");
  return ok("Horários atualizados.");
}

export async function createBlockAction(
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise o bloqueio.", flattenFieldErrors(parsed.error));
  }

  const startMinute = timeToMinutes(parsed.data.start);
  const endMinute = timeToMinutes(parsed.data.end);
  if (startMinute === null || endMinute === null || endMinute <= startMinute) {
    return fail("Intervalo de bloqueio inválido.");
  }

  const db = await getDb();
  const conflicts = await db
    .select({ value: sql<number>`count(*)` })
    .from(appointments)
    .where(
      and(
        eq(appointments.startsOn, parsed.data.day),
        inArray(appointments.status, ["pending", "confirmed"]),
        sql`${appointments.startMinute} < ${endMinute}`,
        sql`${appointments.endMinute} > ${startMinute}`,
      ),
    );

  if (Number(conflicts[0]?.value ?? 0) > 0) {
    return fail(
      "Existem agendamentos ativos nesse período. Cancele ou reagende antes de bloquear.",
    );
  }

  await db.insert(scheduleBlocks).values({
    day: parsed.data.day,
    startMinute,
    endMinute,
    reason: parsed.data.reason,
    createdBy: admin.id,
  });

  await logAdminAction(db, {
    actorId: admin.id,
    action: "block.create",
    entity: "schedule_block",
    details: `${parsed.data.day} ${parsed.data.start}-${parsed.data.end}: ${parsed.data.reason}`,
  });

  revalidatePath("/admin/bloqueios");
  revalidatePath("/admin/agenda");
  revalidatePath("/");
  return ok("Bloqueio criado.");
}

export async function deleteBlockAction(id: string): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const db = await getDb();
  await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, id));
  await logAdminAction(db, {
    actorId: admin.id,
    action: "block.delete",
    entity: "schedule_block",
    entityId: id,
  });

  revalidatePath("/admin/bloqueios");
  revalidatePath("/admin/agenda");
  revalidatePath("/");
  return ok("Bloqueio removido.");
}

export async function updateSettingsAction(
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise as configurações.", flattenFieldErrors(parsed.error));
  }
  if (!isValidTimeZone(parsed.data.timezone)) {
    return fail("Fuso horário inválido.", {
      timezone: "Use um identificador IANA, como America/Sao_Paulo.",
    });
  }

  const db = await getDb();
  await db
    .update(settings)
    .set({
      ...parsed.data,
      description: parsed.data.description || null,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
      email: parsed.data.email || null,
      instagram: parsed.data.instagram || null,
      publicNotice: parsed.data.publicNotice || null,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));

  await logAdminAction(db, {
    actorId: admin.id,
    action: "settings.update",
    entity: "settings",
    entityId: "1",
  });

  revalidatePath("/");
  revalidatePath("/servicos");
  revalidatePath("/admin");
  revalidatePath("/admin/configuracoes");
  return ok("Configurações salvas.");
}

export async function createClientAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const parsed = adminClientSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise os dados da cliente.", flattenFieldErrors(parsed.error));
  }

  if (!parsed.data.password) {
    return fail("Defina uma senha inicial para a cliente.", {
      password: "Senha obrigatória para novo cadastro.",
    });
  }
  const strength = checkPasswordStrength(parsed.data.password);
  if (!strength.ok) {
    return fail(strength.message ?? "Senha fraca.", {
      password: strength.message ?? "Senha fraca.",
    });
  }

  const db = await getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existing[0]) {
    return fail("Já existe uma conta com este e-mail.", {
      email: "E-mail já cadastrado.",
    });
  }

  const inserted = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      passwordHash: await hashPassword(parsed.data.password),
      role: "client",
      isActive: parsed.data.isActive,
    })
    .returning({ id: users.id });

  await logAdminAction(db, {
    actorId: admin.id,
    action: "client.create",
    entity: "user",
    entityId: inserted[0].id,
    details: parsed.data.email,
  });

  revalidatePath("/admin/clientes");
  return ok("Cliente cadastrada.", { id: inserted[0].id });
}

export async function updateClientAction(
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const parsed = adminClientSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise os dados da cliente.", flattenFieldErrors(parsed.error));
  }
  if (!parsed.data.id) return fail("Cliente não identificada.");

  const db = await getDb();
  const duplicate = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(eq(users.email, parsed.data.email), ne(users.id, parsed.data.id)),
    )
    .limit(1);
  if (duplicate[0]) {
    return fail("Já existe outra conta com este e-mail.", {
      email: "E-mail já cadastrado.",
    });
  }

  const updates: Record<string, unknown> = {
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    isActive: parsed.data.isActive,
    updatedAt: new Date(),
  };

  if (parsed.data.password) {
    const strength = checkPasswordStrength(parsed.data.password);
    if (!strength.ok) {
      return fail(strength.message ?? "Senha fraca.", {
        password: strength.message ?? "Senha fraca.",
      });
    }
    updates.passwordHash = await hashPassword(parsed.data.password);
  }

  await db.update(users).set(updates).where(eq(users.id, parsed.data.id));

  if (parsed.data.password || !parsed.data.isActive) {
    await revokeAllSessions(parsed.data.id);
  }

  await logAdminAction(db, {
    actorId: admin.id,
    action: "client.update",
    entity: "user",
    entityId: parsed.data.id,
    details: parsed.data.email,
  });

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${parsed.data.id}`);
  return ok("Dados da cliente atualizados.");
}

export async function adminCreateBookingAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const parsed = adminBookingSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise o agendamento.", flattenFieldErrors(parsed.error));
  }

  const db = await getDb();
  const client = await db
    .select()
    .from(users)
    .where(and(eq(users.id, parsed.data.clientId), eq(users.role, "client")))
    .limit(1);
  if (!client[0] || !client[0].isActive) {
    return fail("Selecione uma cliente ativa.");
  }

  try {
    const appointment = await createBooking({
      db,
      actor: { id: admin.id, name: admin.name, role: "admin" },
      clientId: parsed.data.clientId,
      day: parsed.data.day,
      startMinute: parsed.data.startMinute,
      serviceIds: parsed.data.serviceIds,
      notes: parsed.data.notes,
      initialStatus: "confirmed",
    });

    await sendAppointmentEmail(db, appointment.id, "booking_created");
    revalidatePath("/admin");
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/agendamentos");
    return ok("Agendamento criado.", { id: appointment.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function adminRescheduleAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise o novo horário.", flattenFieldErrors(parsed.error));
  }

  try {
    const db = await getDb();
    const updated = await rescheduleBooking({
      db,
      actor: { id: admin.id, name: admin.name, role: "admin" },
      appointmentId: parsed.data.appointmentId,
      day: parsed.data.day,
      startMinute: parsed.data.startMinute,
      serviceIds: parsed.data.serviceIds,
    });

    await sendAppointmentEmail(db, updated.id, "booking_rescheduled");
    revalidatePath("/admin");
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/agendamentos");
    return ok("Agendamento alterado.", { id: updated.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function adminCancelAction(
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const parsed = statusSchema.safeParse({
    ...(typeof input === "object" && input ? input : {}),
    status: "cancelled",
  });
  if (!parsed.success) {
    return fail("Informe o agendamento.", flattenFieldErrors(parsed.error));
  }

  try {
    const db = await getDb();
    await cancelBooking({
      db,
      actor: { id: admin.id, name: admin.name, role: "admin" },
      appointmentId: parsed.data.appointmentId,
      reason: parsed.data.reason,
    });
    await sendAppointmentEmail(db, parsed.data.appointmentId, "booking_cancelled");

    revalidatePath("/admin");
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/agendamentos");
    return ok("Agendamento cancelado.");
  } catch (error) {
    return handleError(error);
  }
}

export async function changeStatusAction(
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Revise os dados.", flattenFieldErrors(parsed.error));
  }

  try {
    const db = await getDb();
    await changeAppointmentStatus({
      db,
      actor: { id: admin.id, name: admin.name, role: "admin" },
      appointmentId: parsed.data.appointmentId,
      status: parsed.data.status,
      reason: parsed.data.reason,
    });

    if (parsed.data.status === "confirmed") {
      await sendAppointmentEmail(
        db,
        parsed.data.appointmentId,
        "booking_confirmed",
      );
    }
    if (parsed.data.status === "cancelled") {
      await sendAppointmentEmail(
        db,
        parsed.data.appointmentId,
        "booking_cancelled",
      );
    }

    revalidatePath("/admin");
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/agendamentos");
    revalidatePath(`/admin/agendamentos/${parsed.data.appointmentId}`);
    revalidatePath("/painel/agendamentos");
    return ok("Status atualizado.");
  } catch (error) {
    return handleError(error);
  }
}

export async function setPaymentAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin) return fail("Acesso restrito ao administrador.");

  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.");

  try {
    const db = await getDb();
    await setPaymentStatus({
      db,
      actor: { id: admin.id, name: admin.name, role: "admin" },
      appointmentId: parsed.data.appointmentId,
      paid: parsed.data.paid,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/agendamentos");
    revalidatePath("/admin/relatorios");
    return ok(parsed.data.paid ? "Pagamento registrado." : "Pagamento reaberto.");
  } catch (error) {
    return handleError(error);
  }
}
