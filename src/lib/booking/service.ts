import { and, asc, eq, gte, inArray, lte, ne } from "drizzle-orm";

import { getDb, type AppDb } from "@/lib/db";
import {
  appointmentHistory,
  appointmentItems,
  appointments,
  appointmentDayLocks,
  businessHours,
  scheduleBlocks,
  services,
  users,
  type Appointment,
  type Service,
  type Settings,
} from "@/lib/db/schema";
import {
  addDays,
  daysInMonth,
  getSalonNow,
  minutesToTime,
  type SalonNow,
} from "@/lib/dates";
import {
  computeDayAvailability,
  type DayAvailability,
  type DayHours,
  type MinuteRange,
} from "@/lib/booking/availability";
import { getSettings } from "@/lib/settings";

export class BookingError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const OCCUPYING_STATUSES = ["pending", "confirmed", "completed"] as const;

export type AvailabilityResult = DayAvailability & {
  day: string;
  durationMin: number;
  priceCents: number;
  serviceCount: number;
  timezone: string;
  dayLabel?: string;
};

export type MonthAvailability = {
  month: string;
  days: Record<string, { available: boolean; reason: DayAvailability["reason"] }>;
};

export async function getActiveServices(db?: AppDb): Promise<Service[]> {
  const database = db ?? (await getDb());
  return database
    .select()
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.sortOrder), asc(services.name));
}

export async function getAllServices(db?: AppDb): Promise<Service[]> {
  const database = db ?? (await getDb());
  return database
    .select()
    .from(services)
    .orderBy(asc(services.sortOrder), asc(services.name));
}

export async function getServiceByIds(
  ids: string[],
  db?: AppDb,
): Promise<Service[]> {
  const database = db ?? (await getDb());
  if (ids.length === 0) return [];
  return database
    .select()
    .from(services)
    .where(and(inArray(services.id, ids), eq(services.isActive, true)));
}

async function getHoursMap(db: AppDb): Promise<Map<number, DayHours>> {
  const rows = await db.select().from(businessHours);
  const map = new Map<number, DayHours>();
  for (const row of rows) {
    map.set(row.weekday, {
      isOpen: row.isOpen,
      openMinute: row.openMinute,
      closeMinute: row.closeMinute,
      breakStartMinute: row.breakStartMinute,
      breakEndMinute: row.breakEndMinute,
    });
  }
  return map;
}

async function getBlocks(db: AppDb, day: string): Promise<MinuteRange[]> {
  const rows = await db
    .select()
    .from(scheduleBlocks)
    .where(eq(scheduleBlocks.day, day));
  return rows.map((row) => ({
    startMinute: row.startMinute,
    endMinute: row.endMinute,
  }));
}

async function getBusyRanges(
  db: AppDb,
  day: string,
  ignoreAppointmentId?: string,
): Promise<MinuteRange[]> {
  const conditions = [
    eq(appointments.startsOn, day),
    inArray(appointments.status, [...OCCUPYING_STATUSES]),
  ];
  if (ignoreAppointmentId) {
    conditions.push(ne(appointments.id, ignoreAppointmentId));
  }

  const rows = await db
    .select({
      startMinute: appointments.startMinute,
      endMinute: appointments.endMinute,
    })
    .from(appointments)
    .where(and(...conditions));

  return rows;
}

function weekdayOfDay(day: string): number {
  return new Date(`${day}T12:00:00.000Z`).getUTCDay();
}

export async function resolveAvailability(input: {
  db?: AppDb;
  day: string;
  serviceIds: string[];
  now?: SalonNow;
  ignoreAppointmentId?: string;
  durationOverride?: number;
}): Promise<AvailabilityResult> {
  const db = input.db ?? (await getDb());
  const settings = await getSettings(db);
  const now = input.now ?? getSalonNow(settings.timezone);

  const requested = input.serviceIds.filter(Boolean).slice(0, 12);
  const uniqueIds = [...new Set(requested)];
  const serviceRows =
    uniqueIds.length > 0 ? await getServiceByIds(uniqueIds, db) : [];

  if (serviceRows.length !== uniqueIds.length) {
    throw new BookingError(
      "service-unavailable",
      "Um dos serviços selecionados não está mais disponível.",
    );
  }

  const durationMin =
    input.durationOverride ??
    serviceRows.reduce((total, service) => total + service.durationMin, 0);
  const priceCents = serviceRows.reduce(
    (total, service) => total + service.priceCents,
    0,
  );

  const hoursMap = await getHoursMap(db);
  const hours = hoursMap.get(weekdayOfDay(input.day)) ?? null;
  const blocks = await getBlocks(db, input.day);
  const busy = await getBusyRanges(db, input.day, input.ignoreAppointmentId);

  const result = computeDayAvailability({
    day: input.day,
    durationMin,
    hours,
    blocks,
    busy,
    now,
    rules: {
      slotGranularityMin: settings.slotGranularityMin,
      minLeadMinutes: settings.minLeadMinutes,
      maxLeadDays: settings.maxLeadDays,
    },
  });

  return {
    ...result,
    durationMin,
    priceCents,
    serviceCount: serviceRows.length,
    timezone: settings.timezone,
  };
}

export async function getMonthAvailability(input: {
  db?: AppDb;
  month: string;
  serviceIds: string[];
  now?: SalonNow;
}): Promise<MonthAvailability & { durationMin: number; priceCents: number }> {
  const db = input.db ?? (await getDb());
  const settings = await getSettings(db);
  const now = input.now ?? getSalonNow(settings.timezone);
  const days = daysInMonth(input.month);
  const first = days[0];
  const last = days[days.length - 1];

  const serviceRows = await getServiceByIds(
    [...new Set(input.serviceIds.filter(Boolean))],
    db,
  );
  if (serviceRows.length !== [...new Set(input.serviceIds.filter(Boolean))].length) {
    throw new BookingError(
      "service-unavailable",
      "Um dos serviços selecionados não está mais disponível.",
    );
  }

  const durationMin = serviceRows.reduce(
    (total, service) => total + service.durationMin,
    0,
  );
  const priceCents = serviceRows.reduce(
    (total, service) => total + service.priceCents,
    0,
  );

  const hoursMap = await getHoursMap(db);

  const [blockRows, appointmentRows] = await Promise.all([
    db
      .select()
      .from(scheduleBlocks)
      .where(and(gte(scheduleBlocks.day, first), lte(scheduleBlocks.day, last))),
    db
      .select({
        startsOn: appointments.startsOn,
        startMinute: appointments.startMinute,
        endMinute: appointments.endMinute,
      })
      .from(appointments)
      .where(
        and(
          gte(appointments.startsOn, first),
          lte(appointments.startsOn, last),
          inArray(appointments.status, [...OCCUPYING_STATUSES]),
        ),
      ),
  ]);

  const blocksByDay = new Map<string, MinuteRange[]>();
  for (const block of blockRows) {
    const list = blocksByDay.get(block.day) ?? [];
    list.push({
      startMinute: block.startMinute,
      endMinute: block.endMinute,
    });
    blocksByDay.set(block.day, list);
  }

  const busyByDay = new Map<string, MinuteRange[]>();
  for (const appointment of appointmentRows) {
    const list = busyByDay.get(appointment.startsOn) ?? [];
    list.push({
      startMinute: appointment.startMinute,
      endMinute: appointment.endMinute,
    });
    busyByDay.set(appointment.startsOn, list);
  }

  const result: MonthAvailability["days"] = {};
  for (const day of days) {
    const availability = computeDayAvailability({
      day,
      durationMin,
      hours: hoursMap.get(weekdayOfDay(day)) ?? null,
      blocks: blocksByDay.get(day) ?? [],
      busy: busyByDay.get(day) ?? [],
      now,
      rules: {
        slotGranularityMin: settings.slotGranularityMin,
        minLeadMinutes: settings.minLeadMinutes,
        maxLeadDays: settings.maxLeadDays,
      },
    });
    result[day] = {
      available: availability.slots.length > 0,
      reason: availability.reason,
    };
  }

  return {
    month: input.month,
    days: result,
    durationMin,
    priceCents,
  };
}

function toDayHours(
  rows: { weekday: number; isOpen: boolean; openMinute: number; closeMinute: number; breakStartMinute: number | null; breakEndMinute: number | null }[],
  weekday: number,
): DayHours | null {
  const row = rows.find((item) => item.weekday === weekday);
  if (!row) return null;
  return {
    isOpen: row.isOpen,
    openMinute: row.openMinute,
    closeMinute: row.closeMinute,
    breakStartMinute: row.breakStartMinute,
    breakEndMinute: row.breakEndMinute,
  };
}

async function lockDay(tx: AppDb, day: string) {
  await tx
    .insert(appointmentDayLocks)
    .values({ day })
    .onConflictDoNothing({ target: appointmentDayLocks.day });
  await tx
    .select()
    .from(appointmentDayLocks)
    .where(eq(appointmentDayLocks.day, day))
    .for("update");
}

type BookingActor = { id: string; name: string; role: "client" | "admin" };

async function loadBookingContext(
  tx: AppDb,
  day: string,
  serviceIds: string[],
  settings: Settings,
  now: SalonNow,
  ignoreAppointmentId?: string,
) {
  const uniqueIds = [...new Set(serviceIds)];
  const serviceRows = await tx
    .select()
    .from(services)
    .where(and(inArray(services.id, uniqueIds), eq(services.isActive, true)));

  if (serviceRows.length !== uniqueIds.length) {
    throw new BookingError(
      "service-unavailable",
      "Um dos serviços selecionados não está mais disponível.",
    );
  }

  const ordered = uniqueIds
    .map((id) => serviceRows.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service));

  if (ordered.length === 0) {
    throw new BookingError(
      "no-services",
      "Selecione pelo menos um serviço.",
    );
  }
  if (ordered.length > settings.maxServicesPerBooking) {
    throw new BookingError(
      "too-many-services",
      `É possível selecionar até ${settings.maxServicesPerBooking} serviços por agendamento.`,
    );
  }

  const durationMin = ordered.reduce(
    (total, service) => total + service.durationMin,
    0,
  );
  const priceCents = ordered.reduce(
    (total, service) => total + service.priceCents,
    0,
  );

  const hoursRows = await tx.select().from(businessHours);
  const hours = toDayHours(hoursRows, weekdayOfDay(day));
  const blocks = await getBlocks(tx, day);
  const busy = await getBusyRanges(tx, day, ignoreAppointmentId);
  const availability = computeDayAvailability({
    day,
    durationMin,
    hours,
    blocks,
    busy,
    now,
    rules: {
      slotGranularityMin: settings.slotGranularityMin,
      minLeadMinutes: settings.minLeadMinutes,
      maxLeadDays: settings.maxLeadDays,
    },
  });

  return { ordered, durationMin, priceCents, availability };
}

export async function createBooking(input: {
  db?: AppDb;
  actor: BookingActor;
  clientId: string;
  day: string;
  startMinute: number;
  serviceIds: string[];
  notes?: string;
  initialStatus?: "pending" | "confirmed";
}): Promise<Appointment> {
  const db = input.db ?? (await getDb());
  const settings = await getSettings(db);
  const now = getSalonNow(settings.timezone);
  const actor = input.actor;

  // Cliente só agenda para si mesmo. Admin pode agendar para qualquer cliente.
  if (actor.role === "client" && actor.id !== input.clientId) {
    throw new BookingError("forbidden", "Você só pode agendar em seu nome.");
  }

  const created = await db.transaction(async (tx) => {
    const txDb = tx as unknown as AppDb;
    await lockDay(txDb, input.day);
    const context = await loadBookingContext(
      txDb,
      input.day,
      input.serviceIds,
      settings,
      now,
    );

    if (context.availability.reason === "past") {
      throw new BookingError(
        "past",
        "Não é possível agendar em uma data passada.",
      );
    }
    if (context.availability.reason === "beyond-window") {
      throw new BookingError(
        "beyond-window",
        `Os agendamentos estão abertos para os próximos ${settings.maxLeadDays} dias.`,
      );
    }
    if (context.availability.reason === "closed") {
      throw new BookingError("closed", "O salão não abre nesse dia.");
    }
    if (!context.availability.slots.includes(input.startMinute)) {
      throw new BookingError(
        "slot-unavailable",
        "Este horário não está mais disponível. Escolha outro horário.",
      );
    }

    const endMinute = input.startMinute + context.durationMin;
    const status =
      input.initialStatus ??
      (actor.role === "admin" || settings.autoConfirm ? "confirmed" : "pending");

    const [appointment] = await tx
      .insert(appointments)
      .values({
        clientId: input.clientId,
        startsOn: input.day,
        startMinute: input.startMinute,
        endMinute,
        status,
        totalPriceCents: context.priceCents,
        totalDurationMin: context.durationMin,
        notes: input.notes?.trim() || null,
        createdBy: actor.id,
      })
      .returning();

    await tx.insert(appointmentItems).values(
      context.ordered.map((service, index) => ({
        appointmentId: appointment.id,
        serviceId: service.id,
        serviceName: service.name,
        priceCents: service.priceCents,
        durationMin: service.durationMin,
        sortOrder: index,
      })),
    );

    await tx.insert(appointmentHistory).values({
      appointmentId: appointment.id,
      actorId: actor.id,
      actorName: actor.name,
      action: "created",
      details: `Agendamento criado (${context.ordered.length} serviço${
        context.ordered.length > 1 ? "s" : ""
      }) para ${input.day} às ${minutesToTime(input.startMinute)}.`,
    });

    return appointment;
  });

  return created;
}

export type AppointmentWithClient = Appointment & {
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
};

export async function getAppointmentWithClient(
  id: string,
  db?: AppDb,
): Promise<AppointmentWithClient | null> {
  const database = db ?? (await getDb());
  const rows = await database
    .select({
      appointment: appointments,
      clientName: users.name,
      clientEmail: users.email,
      clientPhone: users.phone,
    })
    .from(appointments)
    .innerJoin(users, eq(appointments.clientId, users.id))
    .where(eq(appointments.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    ...row.appointment,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    clientPhone: row.clientPhone,
  };
}

export async function getAppointmentItems(appointmentId: string, db?: AppDb) {
  const database = db ?? (await getDb());
  return database
    .select()
    .from(appointmentItems)
    .where(eq(appointmentItems.appointmentId, appointmentId))
    .orderBy(asc(appointmentItems.sortOrder));
}

export async function getAppointmentHistory(
  appointmentId: string,
  db?: AppDb,
) {
  const database = db ?? (await getDb());
  return database
    .select()
    .from(appointmentHistory)
    .where(eq(appointmentHistory.appointmentId, appointmentId))
    .orderBy(asc(appointmentHistory.createdAt));
}

export async function rescheduleBooking(input: {
  db?: AppDb;
  actor: BookingActor;
  appointmentId: string;
  day: string;
  startMinute: number;
  serviceIds?: string[];
  reason?: string;
}): Promise<Appointment> {
  const db = input.db ?? (await getDb());
  const settings = await getSettings(db);
  const now = getSalonNow(settings.timezone);

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(appointments)
      .where(eq(appointments.id, input.appointmentId))
      .limit(1);
    const appointment = rows[0];
    if (!appointment) {
      throw new BookingError("not-found", "Agendamento não encontrado.");
    }
    if (
      input.actor.role === "client" &&
      appointment.clientId !== input.actor.id
    ) {
      throw new BookingError("forbidden", "Acesso negado a este agendamento.");
    }
    if (!["pending", "confirmed"].includes(appointment.status)) {
      throw new BookingError(
        "invalid-status",
        "Este agendamento não pode mais ser alterado.",
      );
    }

    if (input.actor.role === "client") {
      const leadMinutes =
        daysBetweenLocal(now.day, appointment.startsOn) * 24 * 60 +
        appointment.startMinute -
        now.minute;
      if (leadMinutes < settings.rescheduleMinHours * 60) {
        throw new BookingError(
          "deadline",
          `Alterações só podem ser feitas com ${settings.rescheduleMinHours}h de antecedência.`,
        );
      }
    }

    const currentItems = await tx
      .select()
      .from(appointmentItems)
      .where(eq(appointmentItems.appointmentId, appointment.id));
    const serviceIds =
      input.serviceIds && input.actor.role === "admin"
        ? input.serviceIds
        : currentItems
            .map((item) => item.serviceId)
            .filter((id): id is string => Boolean(id));

    if (serviceIds.length === 0) {
      throw new BookingError(
        "service-unavailable",
        "Não foi possível recuperar os serviços deste agendamento.",
      );
    }

    const txDb = tx as unknown as AppDb;
    const dayChanged = appointment.startsOn !== input.day;
    if (dayChanged) {
      await lockDay(txDb, input.day);
    } else {
      await lockDay(txDb, appointment.startsOn);
    }

    const context = await loadBookingContext(
      txDb,
      input.day,
      serviceIds,
      settings,
      now,
      appointment.id,
    );

    if (!context.availability.slots.includes(input.startMinute)) {
      throw new BookingError(
        "slot-unavailable",
        "Este horário não está disponível. Escolha outro.",
      );
    }

    const [updated] = await tx
      .update(appointments)
      .set({
        startsOn: input.day,
        startMinute: input.startMinute,
        endMinute: input.startMinute + context.durationMin,
        totalDurationMin: context.durationMin,
        totalPriceCents: context.priceCents,
        status:
          input.actor.role === "client" && !settings.autoConfirm
            ? "pending"
            : appointment.status,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointment.id))
      .returning();

    if (input.actor.role === "admin" && input.serviceIds) {
      await tx
        .delete(appointmentItems)
        .where(eq(appointmentItems.appointmentId, appointment.id));
      await tx.insert(appointmentItems).values(
        context.ordered.map((service, index) => ({
          appointmentId: appointment.id,
          serviceId: service.id,
          serviceName: service.name,
          priceCents: service.priceCents,
          durationMin: service.durationMin,
          sortOrder: index,
        })),
      );
    }

    await tx.insert(appointmentHistory).values({
      appointmentId: appointment.id,
      actorId: input.actor.id,
      actorName: input.actor.name,
      action: "rescheduled",
      details: `Alterado de ${appointment.startsOn} ${minutesToTime(
        appointment.startMinute,
      )} para ${input.day} ${minutesToTime(input.startMinute)}.${
        input.reason ? ` Motivo: ${input.reason}` : ""
      }`,
    });

    return updated;
  });
}

function daysBetweenLocal(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T12:00:00.000Z`).getTime() -
      new Date(`${from}T12:00:00.000Z`).getTime()) /
      86_400_000,
  );
}

export async function cancelBooking(input: {
  db?: AppDb;
  actor: BookingActor;
  appointmentId: string;
  reason?: string;
}): Promise<Appointment> {
  const db = input.db ?? (await getDb());
  const settings = await getSettings(db);
  const now = getSalonNow(settings.timezone);

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(appointments)
      .where(eq(appointments.id, input.appointmentId))
      .limit(1);
    const appointment = rows[0];
    if (!appointment) {
      throw new BookingError("not-found", "Agendamento não encontrado.");
    }
    if (
      input.actor.role === "client" &&
      appointment.clientId !== input.actor.id
    ) {
      throw new BookingError("forbidden", "Acesso negado a este agendamento.");
    }
    if (!["pending", "confirmed"].includes(appointment.status)) {
      throw new BookingError(
        "invalid-status",
        "Este agendamento não pode mais ser cancelado.",
      );
    }

    if (input.actor.role === "client") {
      const leadMinutes =
        daysBetweenLocal(now.day, appointment.startsOn) * 24 * 60 +
        appointment.startMinute -
        now.minute;
      if (leadMinutes < settings.cancelMinHours * 60) {
        throw new BookingError(
          "deadline",
          `Cancelamentos pelo site são permitidos até ${settings.cancelMinHours}h antes. Fale com o salão.`,
        );
      }
    }

    const [updated] = await tx
      .update(appointments)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: input.reason?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointment.id))
      .returning();

    await tx.insert(appointmentHistory).values({
      appointmentId: appointment.id,
      actorId: input.actor.id,
      actorName: input.actor.name,
      action: "cancelled",
      details: input.reason
        ? `Cancelado. Motivo: ${input.reason}`
        : "Cancelado.",
    });

    return updated;
  });
}

export const STATUS_LABELS: Record<Appointment["status"], string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

export async function changeAppointmentStatus(input: {
  db?: AppDb;
  actor: BookingActor;
  appointmentId: string;
  status: Appointment["status"];
  reason?: string;
}): Promise<Appointment> {
  if (input.actor.role !== "admin") {
    throw new BookingError("forbidden", "Ação exclusiva do administrador.");
  }
  const db = input.db ?? (await getDb());

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(appointments)
      .where(eq(appointments.id, input.appointmentId))
      .limit(1);
    const appointment = rows[0];
    if (!appointment) {
      throw new BookingError("not-found", "Agendamento não encontrado.");
    }

    const [updated] = await tx
      .update(appointments)
      .set({
        status: input.status,
        cancelledAt:
          input.status === "cancelled" ? new Date() : appointment.cancelledAt,
        cancelReason:
          input.status === "cancelled"
            ? input.reason?.trim() || appointment.cancelReason
            : appointment.cancelReason,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointment.id))
      .returning();

    await tx.insert(appointmentHistory).values({
      appointmentId: appointment.id,
      actorId: input.actor.id,
      actorName: input.actor.name,
      action: `status:${input.status}`,
      details: `Status alterado de "${STATUS_LABELS[appointment.status]}" para "${
        STATUS_LABELS[input.status]
      }".${input.reason ? ` Motivo: ${input.reason}` : ""}`,
    });

    return updated;
  });
}

export async function setPaymentStatus(input: {
  db?: AppDb;
  actor: BookingActor;
  appointmentId: string;
  paid: boolean;
}): Promise<Appointment> {
  if (input.actor.role !== "admin") {
    throw new BookingError("forbidden", "Ação exclusiva do administrador.");
  }
  const db = input.db ?? (await getDb());
  const [updated] = await db
    .update(appointments)
    .set({
      paymentStatus: input.paid ? "paid" : "unpaid",
      paidAt: input.paid ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, input.appointmentId))
    .returning();

  if (!updated) {
    throw new BookingError("not-found", "Agendamento não encontrado.");
  }

  await db.insert(appointmentHistory).values({
    appointmentId: input.appointmentId,
    actorId: input.actor.id,
    actorName: input.actor.name,
    action: "payment",
    details: input.paid
      ? "Pagamento registrado como recebido."
      : "Pagamento marcado como pendente.",
  });

  return updated;
}

export function addDaysToNow(now: SalonNow, days: number): SalonNow {
  return { day: addDays(now.day, days), minute: now.minute };
}

export async function getNextAvailability(
  daysToScan = 21,
): Promise<{
  day: string;
  minute: number;
  serviceId: string;
  serviceName: string;
  durationMin: number;
  priceCents: number;
  timezone: string;
  slots: number[];
} | null> {
  const db = await getDb();
  const settings = await getSettings(db);
  const now = getSalonNow(settings.timezone);
  const active = await getActiveServices(db);
  if (active.length === 0) return null;

  const service = active[0];
  for (let index = 0; index < daysToScan; index += 1) {
    const day = addDays(now.day, index);
    const availability = await resolveAvailability({
      db,
      day,
      serviceIds: [service.id],
      now,
    });
    if (availability.slots.length > 0) {
      return {
        day,
        minute: availability.slots[0],
        serviceId: service.id,
        serviceName: service.name,
        durationMin: service.durationMin,
        priceCents: service.priceCents,
        timezone: settings.timezone,
        slots: availability.slots.slice(0, 4),
      };
    }
  }

  return null;
}
