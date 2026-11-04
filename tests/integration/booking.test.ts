import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  appointmentDayLocks,
  appointmentHistory,
  appointmentItems,
  appointments,
  businessHours,
  scheduleBlocks,
  services,
  settings,
} from "@/lib/db/schema";
import { addDays, getSalonNow } from "@/lib/dates";
import {
  BookingError,
  cancelBooking,
  changeAppointmentStatus,
  createBooking,
  getAppointmentHistory,
  getAppointmentItems,
  rescheduleBooking,
  resolveAvailability,
  setPaymentStatus,
} from "@/lib/booking/service";
import {
  getAdminAppointmentDetail,
  getClientAppointmentDetail,
  getClientAppointments,
} from "@/lib/booking/queries";
import { serviceByName, type TestContext } from "../helpers/db";
import { createTestContext } from "../helpers/db";
import { CATALOG } from "../../scripts/seed-data";

const TIMEZONE = "America/Sao_Paulo";

let context: TestContext;
let now = getSalonNow(TIMEZONE);
let bookingDay = addDays(now.day, 5);

function actorClientA() {
  return { id: context.clientA.id, name: context.clientA.name, role: "client" as const };
}

function actorClientB() {
  return { id: context.clientB.id, name: context.clientB.name, role: "client" as const };
}

function actorAdmin() {
  return { id: context.admin.id, name: context.admin.name, role: "admin" as const };
}

async function newBooking(options?: {
  day?: string;
  startMinute?: number;
  serviceNames?: string[];
}) {
  const names = options?.serviceNames ?? ["Manicure & esmaltação"];
  const ids = names.map((name) => serviceByName(context, name).id);
  return createBooking({
    db: context.db,
    actor: actorClientA(),
    clientId: context.clientA.id,
    day: options?.day ?? bookingDay,
    startMinute: options?.startMinute ?? 10 * 60,
    serviceIds: ids,
  });
}

/** Insere um agendamento "legado" direto no banco, sem passar pelas regras de disponibilidade. */
async function insertAppointment(input: {
  clientId: string;
  day: string;
  startMinute: number;
  durationMin: number;
  status?: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
}) {
  const [row] = await context.db
    .insert(appointments)
    .values({
      clientId: input.clientId,
      startsOn: input.day,
      startMinute: input.startMinute,
      endMinute: input.startMinute + input.durationMin,
      totalPriceCents: 10000,
      totalDurationMin: input.durationMin,
      status: input.status ?? "confirmed",
      createdBy: context.admin.id,
    })
    .returning();
  return row;
}

beforeAll(async () => {
  context = await createTestContext();
  now = getSalonNow(TIMEZONE);
  bookingDay = addDays(now.day, 5);
});

afterAll(async () => {
  await context.close();
});

beforeEach(async () => {
  await context.db.delete(appointmentHistory);
  await context.db.delete(appointmentItems);
  await context.db.delete(appointments);
  await context.db.delete(appointmentDayLocks);
  await context.db.delete(scheduleBlocks);
  await context.db
    .update(settings)
    .set({ autoConfirm: true, maxServicesPerBooking: 3 })
    .where(eq(settings.id, 1));
  await context.db.update(services).set({ isActive: true });
  // Restaura o catálogo original, pois alguns testes editam nome/preço/duração.
  await Promise.all(
    CATALOG.map((item) =>
      context.db
        .update(services)
        .set({
          name: item.name,
          priceCents: item.priceCents,
          durationMin: item.durationMin,
          isActive: true,
        })
        .where(eq(services.slug, item.slug)),
    ),
  );
  await context.db.update(businessHours).set({
    isOpen: true,
    openMinute: 9 * 60,
    closeMinute: 19 * 60,
    breakStartMinute: null,
    breakEndMinute: null,
  });
});

describe("createBooking", () => {
  it("grava o agendamento com snapshot dos serviços, totais e histórico", async () => {
    const appointment = await newBooking({
      serviceNames: ["Manicure & esmaltação", "Unhas em gel"],
    });

    expect(appointment.status).toBe("confirmed");
    expect(appointment.startsOn).toBe(bookingDay);
    expect(appointment.startMinute).toBe(600);
    expect(appointment.endMinute).toBe(720);
    expect(appointment.totalDurationMin).toBe(120);
    expect(appointment.totalPriceCents).toBe(17500);
    expect(appointment.clientId).toBe(context.clientA.id);
    expect(appointment.paymentStatus).toBe("unpaid");

    const items = await getAppointmentItems(appointment.id, context.db);
    expect(items.map((item) => item.serviceName)).toEqual([
      "Manicure & esmaltação",
      "Unhas em gel",
    ]);
    expect(items.map((item) => item.priceCents)).toEqual([5500, 12000]);
    expect(items.map((item) => item.durationMin)).toEqual([40, 80]);
    expect(items.map((item) => item.sortOrder)).toEqual([0, 1]);

    const history = await getAppointmentHistory(appointment.id, context.db);
    expect(history).toHaveLength(1);
    expect(history[0]?.action).toBe("created");
    expect(history[0]?.actorName).toBe(context.clientA.name);
  });

  it("preserva nome e preço originais mesmo após edição do serviço", async () => {
    const appointment = await newBooking({ serviceNames: ["Manicure & esmaltação"] });
    const service = serviceByName(context, "Manicure & esmaltação");

    await context.db
      .update(services)
      .set({ name: "Manicure blindada", priceCents: 99000, durationMin: 15 })
      .where(eq(services.id, service.id));

    const detail = await getAdminAppointmentDetail(appointment.id, context.db);
    expect(detail?.items[0]?.serviceName).toBe("Manicure & esmaltação");
    expect(detail?.items[0]?.priceCents).toBe(5500);
    expect(detail?.items[0]?.durationMin).toBe(40);

    const stored = await context.db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointment.id));
    expect(stored[0]?.totalPriceCents).toBe(5500);
    expect(stored[0]?.totalDurationMin).toBe(40);
  });

  it("recusa serviço inexistente ou inativo", async () => {
    await expect(
      createBooking({
        db: context.db,
        actor: actorClientA(),
        clientId: context.clientA.id,
        day: bookingDay,
        startMinute: 600,
        serviceIds: ["00000000-0000-4000-8000-000000000000"],
      }),
    ).rejects.toMatchObject({ code: "service-unavailable" });

    const service = serviceByName(context, "Manicure & esmaltação");
    await context.db
      .update(services)
      .set({ isActive: false })
      .where(eq(services.id, service.id));

    await expect(newBooking({ serviceNames: ["Manicure & esmaltação"] })).rejects.toMatchObject({
      code: "service-unavailable",
    });
  });

  it("impede que um cliente agende em nome de outra pessoa", async () => {
    await expect(
      createBooking({
        db: context.db,
        actor: actorClientA(),
        clientId: context.clientB.id,
        day: bookingDay,
        startMinute: 600,
        serviceIds: [serviceByName(context, "Manicure & esmaltação").id],
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("respeita o limite de serviços por agendamento", async () => {
    // O cardápio tem três serviços; para provar a regra, o limite do salão é
    // baixado para dois e a reserva pede os três.
    await context.db
      .update(settings)
      .set({ maxServicesPerBooking: 2 })
      .where(eq(settings.id, 1));

    await expect(
      newBooking({
        serviceNames: [
          "Manicure & esmaltação",
          "Pedicure & esmaltação",
          "Unhas em gel",
        ],
        startMinute: 9 * 60,
      }),
    ).rejects.toMatchObject({ code: "too-many-services" });
  });

  it("cria como pendente quando a confirmação automática está desligada", async () => {
    await context.db
      .update(settings)
      .set({ autoConfirm: false })
      .where(eq(settings.id, 1));

    const clientBooking = await newBooking({ startMinute: 10 * 60 });
    expect(clientBooking.status).toBe("pending");

    const adminBooking = await createBooking({
      db: context.db,
      actor: actorAdmin(),
      clientId: context.clientB.id,
      day: bookingDay,
      startMinute: 12 * 60,
      serviceIds: [serviceByName(context, "Manicure & esmaltação").id],
    });
    expect(adminBooking.status).toBe("confirmed");
  });

  it("respeita data passada e janela máxima de antecedência", async () => {
    await expect(
      newBooking({ day: addDays(now.day, -1) }),
    ).rejects.toMatchObject({ code: "past" });

    await expect(
      newBooking({ day: addDays(now.day, 90) }),
    ).rejects.toMatchObject({ code: "beyond-window" });
  });

  it("respeita bloqueios e dias fechados", async () => {
    await context.db.insert(scheduleBlocks).values({
      day: bookingDay,
      startMinute: 10 * 60,
      endMinute: 12 * 60,
      reason: "Manutenção",
      createdBy: context.admin.id,
    });

    await expect(newBooking({ startMinute: 10 * 60 })).rejects.toMatchObject({
      code: "slot-unavailable",
    });

    const afterBlock = await newBooking({ startMinute: 12 * 60 });
    expect(afterBlock.startMinute).toBe(720);

    const weekday = new Date(`${bookingDay}T12:00:00.000Z`).getUTCDay();
    await context.db
      .update(businessHours)
      .set({ isOpen: false })
      .where(eq(businessHours.weekday, weekday));

    await expect(
      newBooking({ startMinute: 14 * 60 }),
    ).rejects.toMatchObject({ code: "closed" });
  });
});

describe("conflitos de horário", () => {
  it("detecta sobreposição e permite encaixe em sequência", async () => {
    await newBooking({ startMinute: 10 * 60 });

    await expect(
      createBooking({
        db: context.db,
        actor: actorClientB(),
        clientId: context.clientB.id,
        day: bookingDay,
        startMinute: 10 * 60 + 30,
        serviceIds: [serviceByName(context, "Manicure & esmaltação").id],
      }),
    ).rejects.toMatchObject({ code: "slot-unavailable" });

    const backToBack = await createBooking({
      db: context.db,
      actor: actorClientB(),
      clientId: context.clientB.id,
      day: bookingDay,
      startMinute: 11 * 60,
      serviceIds: [serviceByName(context, "Manicure & esmaltação").id],
    });
    expect(backToBack.startMinute).toBe(660);
  });

  it("com duas reservas simultâneas, apenas uma é confirmada", async () => {
    const serviceId = serviceByName(context, "Manicure & esmaltação").id;
    const results = await Promise.allSettled([
      createBooking({
        db: context.db,
        actor: actorClientA(),
        clientId: context.clientA.id,
        day: bookingDay,
        startMinute: 15 * 60,
        serviceIds: [serviceId],
      }),
      createBooking({
        db: context.db,
        actor: actorClientB(),
        clientId: context.clientB.id,
        day: bookingDay,
        startMinute: 15 * 60,
        serviceIds: [serviceId],
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const failure = rejected[0] as PromiseRejectedResult;
    expect(failure.reason).toBeInstanceOf(BookingError);
    expect((failure.reason as BookingError).code).toBe("slot-unavailable");

    const rows = await context.db.select().from(appointments);
    expect(rows).toHaveLength(1);
  });

  it("ignora o próprio agendamento ao reagendar e valida o novo horário", async () => {
    const appointment = await newBooking({ startMinute: 10 * 60 });

    const availability = await resolveAvailability({
      db: context.db,
      day: bookingDay,
      serviceIds: [serviceByName(context, "Manicure & esmaltação").id],
      ignoreAppointmentId: appointment.id,
    });
    expect(availability.slots).toContain(600);
  });
});

describe("permissões e visibilidade", () => {
  it("cliente só enxerga e opera os próprios agendamentos", async () => {
    const appointment = await newBooking({ startMinute: 10 * 60 });

    const own = await getClientAppointmentDetail(
      appointment.id,
      context.clientA.id,
      context.db,
    );
    expect(own?.id).toBe(appointment.id);

    const other = await getClientAppointmentDetail(
      appointment.id,
      context.clientB.id,
      context.db,
    );
    expect(other).toBeNull();

    const adminView = await getAdminAppointmentDetail(appointment.id, context.db);
    expect(adminView?.id).toBe(appointment.id);

    const otherList = await getClientAppointments(context.clientB.id, {
      db: context.db,
    });
    expect(otherList).toHaveLength(0);

    await expect(
      cancelBooking({
        db: context.db,
        actor: actorClientB(),
        appointmentId: appointment.id,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });

    await expect(
      rescheduleBooking({
        db: context.db,
        actor: actorClientB(),
        appointmentId: appointment.id,
        day: bookingDay,
        startMinute: 12 * 60,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("bloqueia operações administrativas para clientes", async () => {
    const appointment = await newBooking({ startMinute: 10 * 60 });

    await expect(
      changeAppointmentStatus({
        db: context.db,
        actor: actorClientA(),
        appointmentId: appointment.id,
        status: "completed",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });

    await expect(
      setPaymentStatus({
        db: context.db,
        actor: actorClientA(),
        appointmentId: appointment.id,
        paid: true,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("cancelamento", () => {
  it("permite cancelar com antecedência e registra motivo e histórico", async () => {
    const appointment = await newBooking({ day: addDays(now.day, 10) });

    const cancelled = await cancelBooking({
      db: context.db,
      actor: actorClientA(),
      appointmentId: appointment.id,
      reason: "Viagem",
    });
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledAt).not.toBeNull();
    expect(cancelled.cancelReason).toBe("Viagem");

    const history = await getAppointmentHistory(appointment.id, context.db);
    expect(history.at(-1)?.action).toBe("cancelled");
    expect(history.at(-1)?.details).toContain("Viagem");

    await expect(
      cancelBooking({
        db: context.db,
        actor: actorClientA(),
        appointmentId: appointment.id,
      }),
    ).rejects.toMatchObject({ code: "invalid-status" });
  });

  it("respeita o prazo mínimo e permite que o admin cancele a qualquer momento", async () => {
    const appointment = await insertAppointment({
      clientId: context.clientA.id,
      day: now.day,
      startMinute: now.minute,
      durationMin: 30,
    });

    await expect(
      cancelBooking({
        db: context.db,
        actor: actorClientA(),
        appointmentId: appointment.id,
      }),
    ).rejects.toMatchObject({ code: "deadline" });

    const adminCancelled = await cancelBooking({
      db: context.db,
      actor: actorAdmin(),
      appointmentId: appointment.id,
      reason: "Imprevisto do salão",
    });
    expect(adminCancelled.status).toBe("cancelled");
  });

  it("libera o horário após o cancelamento", async () => {
    const appointment = await newBooking({ startMinute: 10 * 60 });
    await cancelBooking({
      db: context.db,
      actor: actorClientA(),
      appointmentId: appointment.id,
    });

    const availability = await resolveAvailability({
      db: context.db,
      day: bookingDay,
      serviceIds: [serviceByName(context, "Manicure & esmaltação").id],
    });
    expect(availability.slots).toContain(600);
  });
});

describe("reagendamento", () => {
  it("cliente reagenda mantendo serviços e histórico", async () => {
    const appointment = await newBooking({ startMinute: 10 * 60 });

    const updated = await rescheduleBooking({
      db: context.db,
      actor: actorClientA(),
      appointmentId: appointment.id,
      day: bookingDay,
      startMinute: 12 * 60,
      reason: "Mudança de planos",
    });

    expect(updated.startMinute).toBe(720);
    expect(updated.endMinute).toBe(760);
    expect(updated.status).toBe("confirmed");
    expect(updated.totalPriceCents).toBe(5500);

    const items = await getAppointmentItems(appointment.id, context.db);
    expect(items).toHaveLength(1);

    const history = await getAppointmentHistory(appointment.id, context.db);
    expect(history.at(-1)?.action).toBe("rescheduled");
    expect(history.at(-1)?.details).toContain("Mudança de planos");
  });

  it("respeita o prazo mínimo de alteração para clientes", async () => {
    const appointment = await insertAppointment({
      clientId: context.clientA.id,
      day: now.day,
      startMinute: now.minute,
      durationMin: 30,
    });

    await expect(
      rescheduleBooking({
        db: context.db,
        actor: actorClientA(),
        appointmentId: appointment.id,
        day: bookingDay,
        startMinute: 12 * 60,
      }),
    ).rejects.toMatchObject({ code: "deadline" });
  });

  it("admin pode trocar serviços, recalculando preço, duração e snapshots", async () => {
    const appointment = await newBooking({ startMinute: 10 * 60 });
    const design = serviceByName(context, "Pedicure & esmaltação");

    const updated = await rescheduleBooking({
      db: context.db,
      actor: actorAdmin(),
      appointmentId: appointment.id,
      day: bookingDay,
      startMinute: 14 * 60,
      serviceIds: [design.id],
    });

    expect(updated.totalPriceCents).toBe(7000);
    expect(updated.totalDurationMin).toBe(50);
    expect(updated.endMinute).toBe(14 * 60 + 50);

    const items = await getAppointmentItems(appointment.id, context.db);
    expect(items).toHaveLength(1);
    expect(items[0]?.serviceName).toBe("Pedicure & esmaltação");
    expect(items[0]?.priceCents).toBe(7000);
  });

  it("não permite reagendar agendamento concluído", async () => {
    const appointment = await newBooking({ startMinute: 10 * 60 });
    await changeAppointmentStatus({
      db: context.db,
      actor: actorAdmin(),
      appointmentId: appointment.id,
      status: "completed",
    });

    await expect(
      rescheduleBooking({
        db: context.db,
        actor: actorAdmin(),
        appointmentId: appointment.id,
        day: bookingDay,
        startMinute: 12 * 60,
      }),
    ).rejects.toMatchObject({ code: "invalid-status" });
  });
});

describe("ações administrativas", () => {
  it("altera status e pagamento com registro no histórico", async () => {
    const appointment = await newBooking({ startMinute: 10 * 60 });

    const completed = await changeAppointmentStatus({
      db: context.db,
      actor: actorAdmin(),
      appointmentId: appointment.id,
      status: "completed",
    });
    expect(completed.status).toBe("completed");

    const paid = await setPaymentStatus({
      db: context.db,
      actor: actorAdmin(),
      appointmentId: appointment.id,
      paid: true,
    });
    expect(paid.paymentStatus).toBe("paid");
    expect(paid.paidAt).not.toBeNull();

    const history = await getAppointmentHistory(appointment.id, context.db);
    const actions = history.map((entry) => entry.action);
    expect(actions).toContain("status:completed");
    expect(actions).toContain("payment");

    const pending = await setPaymentStatus({
      db: context.db,
      actor: actorAdmin(),
      appointmentId: appointment.id,
      paid: false,
    });
    expect(pending.paymentStatus).toBe("unpaid");
    expect(pending.paidAt).toBeNull();
  });

  it("registra motivo ao cancelar pelo painel", async () => {
    const appointment = await newBooking({ startMinute: 10 * 60 });

    const cancelled = await changeAppointmentStatus({
      db: context.db,
      actor: actorAdmin(),
      appointmentId: appointment.id,
      status: "cancelled",
      reason: "Cliente pediu por telefone",
    });

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelReason).toBe("Cliente pediu por telefone");

    const history = await getAppointmentHistory(appointment.id, context.db);
    expect(history.at(-1)?.details).toContain("Cliente pediu por telefone");
  });
});
