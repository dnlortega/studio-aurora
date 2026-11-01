import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";

import { getDb, type AppDb } from "@/lib/db";
import {
  adminAuditLogs,
  appointmentHistory,
  appointmentItems,
  appointments,
  businessHours,
  scheduleBlocks,
  services,
  users,
  type Appointment,
  type User,
} from "@/lib/db/schema";
import {
  addDays,
  daysBetween,
  daysInMonth,
  formatDayShort,
  getSalonNow,
  monthKey,
  type SalonNow,
} from "@/lib/dates";
import { getSettings } from "@/lib/settings";

export type ItemSnapshot = {
  id: string;
  serviceId: string | null;
  serviceName: string;
  priceCents: number;
  durationMin: number;
};

export type AppointmentListItem = Appointment & {
  items: ItemSnapshot[];
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
};

const ACTIVE_STATUSES = ["pending", "confirmed"] as const;

async function loadItemsByAppointment(
  db: AppDb,
  ids: string[],
): Promise<Map<string, ItemSnapshot[]>> {
  const map = new Map<string, ItemSnapshot[]>();
  if (ids.length === 0) return map;

  const items = await db
    .select()
    .from(appointmentItems)
    .where(inArray(appointmentItems.appointmentId, ids))
    .orderBy(asc(appointmentItems.sortOrder));

  for (const item of items) {
    const list = map.get(item.appointmentId) ?? [];
    list.push({
      id: item.id,
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      priceCents: item.priceCents,
      durationMin: item.durationMin,
    });
    map.set(item.appointmentId, list);
  }

  return map;
}

type ClientJoin = {
  appointment: Appointment;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
};

async function decorate(
  db: AppDb,
  rows: ClientJoin[],
): Promise<AppointmentListItem[]> {
  const items = await loadItemsByAppointment(
    db,
    rows.map((row) => row.appointment.id),
  );
  return rows.map((row) => ({
    ...row.appointment,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    clientPhone: row.clientPhone,
    items: items.get(row.appointment.id) ?? [],
  }));
}

function clientJoinSelection() {
  return {
    appointment: appointments,
    clientName: users.name,
    clientEmail: users.email,
    clientPhone: users.phone,
  };
}

export async function getUpcomingAppointment(
  clientId: string,
  now: SalonNow,
  db?: AppDb,
): Promise<AppointmentListItem | null> {
  const database = db ?? (await getDb());
  const rows = await database
    .select(clientJoinSelection())
    .from(appointments)
    .innerJoin(users, eq(appointments.clientId, users.id))
    .where(
      and(
        eq(appointments.clientId, clientId),
        inArray(appointments.status, [...ACTIVE_STATUSES]),
        or(
          sql`${appointments.startsOn} > ${now.day}`,
          and(
            eq(appointments.startsOn, now.day),
            gte(appointments.endMinute, now.minute),
          ),
        ),
      ),
    )
    .orderBy(asc(appointments.startsOn), asc(appointments.startMinute))
    .limit(1);

  const decorated = await decorate(database, rows);
  return decorated[0] ?? null;
}

export async function getClientAppointments(
  clientId: string,
  options?: {
    db?: AppDb;
    scope?: "upcoming" | "history" | "all";
    now?: SalonNow;
    limit?: number;
  },
): Promise<AppointmentListItem[]> {
  const db = options?.db ?? (await getDb());
  const now = options?.now ?? getSalonNow("America/Sao_Paulo");
  const scope = options?.scope ?? "all";

  const futureCondition = or(
    sql`${appointments.startsOn} > ${now.day}`,
    and(
      eq(appointments.startsOn, now.day),
      gte(appointments.endMinute, now.minute),
    ),
  );

  const upcomingCondition = and(
    eq(appointments.clientId, clientId),
    inArray(appointments.status, [...ACTIVE_STATUSES]),
    futureCondition,
  );

  const historyCondition = and(
    eq(appointments.clientId, clientId),
    or(
      inArray(appointments.status, ["completed", "cancelled", "no_show"]),
      lt(appointments.startsOn, now.day),
      and(
        eq(appointments.startsOn, now.day),
        lt(appointments.endMinute, now.minute),
      ),
    ),
  );

  const where =
    scope === "upcoming"
      ? upcomingCondition
      : scope === "history"
        ? historyCondition
        : eq(appointments.clientId, clientId);

  let query = db
    .select(clientJoinSelection())
    .from(appointments)
    .innerJoin(users, eq(appointments.clientId, users.id))
    .where(where)
    .$dynamic();

  query =
    scope === "upcoming"
      ? query.orderBy(asc(appointments.startsOn), asc(appointments.startMinute))
      : query.orderBy(
          desc(appointments.startsOn),
          desc(appointments.startMinute),
        );

  if (options?.limit) query = query.limit(options.limit);

  const rows = await query;
  return decorate(db, rows);
}

export type AppointmentDetail = AppointmentListItem & {
  history: {
    id: string;
    action: string;
    details: string | null;
    actorName: string;
    createdAt: Date;
  }[];
};

export async function getClientAppointmentDetail(
  id: string,
  clientId: string,
  db?: AppDb,
): Promise<AppointmentDetail | null> {
  const database = db ?? (await getDb());
  const rows = await database
    .select(clientJoinSelection())
    .from(appointments)
    .innerJoin(users, eq(appointments.clientId, users.id))
    .where(
      and(eq(appointments.id, id), eq(appointments.clientId, clientId)),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [decorated] = await decorate(database, [row]);
  const history = await database
    .select({
      id: appointmentHistory.id,
      action: appointmentHistory.action,
      details: appointmentHistory.details,
      actorName: appointmentHistory.actorName,
      createdAt: appointmentHistory.createdAt,
    })
    .from(appointmentHistory)
    .where(eq(appointmentHistory.appointmentId, id))
    .orderBy(asc(appointmentHistory.createdAt));

  return { ...decorated, history };
}

export async function getAdminAppointmentDetail(
  id: string,
  db?: AppDb,
): Promise<AppointmentDetail | null> {
  const database = db ?? (await getDb());
  const rows = await database
    .select(clientJoinSelection())
    .from(appointments)
    .innerJoin(users, eq(appointments.clientId, users.id))
    .where(eq(appointments.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [decorated] = await decorate(database, [row]);
  const history = await database
    .select({
      id: appointmentHistory.id,
      action: appointmentHistory.action,
      details: appointmentHistory.details,
      actorName: appointmentHistory.actorName,
      createdAt: appointmentHistory.createdAt,
    })
    .from(appointmentHistory)
    .where(eq(appointmentHistory.appointmentId, id))
    .orderBy(asc(appointmentHistory.createdAt));

  return { ...decorated, history };
}

export async function getAppointmentsForDay(
  day: string,
  db?: AppDb,
): Promise<AppointmentListItem[]> {
  const database = db ?? (await getDb());
  const rows = await database
    .select(clientJoinSelection())
    .from(appointments)
    .innerJoin(users, eq(appointments.clientId, users.id))
    .where(eq(appointments.startsOn, day))
    .orderBy(asc(appointments.startMinute));
  return decorate(database, rows);
}

export async function getAppointmentsBetween(
  from: string,
  to: string,
  db?: AppDb,
): Promise<AppointmentListItem[]> {
  const database = db ?? (await getDb());
  const rows = await database
    .select(clientJoinSelection())
    .from(appointments)
    .innerJoin(users, eq(appointments.clientId, users.id))
    .where(
      and(gte(appointments.startsOn, from), lte(appointments.startsOn, to)),
    )
    .orderBy(asc(appointments.startsOn), asc(appointments.startMinute));
  return decorate(database, rows);
}

export type AppointmentSearchFilters = {
  from?: string;
  to?: string;
  status?: string[];
  serviceId?: string;
  clientQuery?: string;
  page?: number;
  pageSize?: number;
};

export async function searchAppointments(
  filters: AppointmentSearchFilters,
  db?: AppDb,
): Promise<{ items: AppointmentListItem[]; total: number; page: number; pageSize: number }> {
  const database = db ?? (await getDb());
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, filters.pageSize ?? 20));

  const conditions = [];
  if (filters.from) conditions.push(gte(appointments.startsOn, filters.from));
  if (filters.to) conditions.push(lte(appointments.startsOn, filters.to));
  if (filters.status && filters.status.length > 0) {
    conditions.push(inArray(appointments.status, filters.status as never));
  }
  if (filters.serviceId) {
    conditions.push(
      sql`exists (select 1 from ${appointmentItems} where ${appointmentItems.appointmentId} = ${appointments.id} and ${appointmentItems.serviceId} = ${filters.serviceId})`,
    );
  }
  if (filters.clientQuery?.trim()) {
    const term = `%${filters.clientQuery.trim()}%`;
    conditions.push(
      or(
        ilike(users.name, term),
        ilike(users.email, term),
        ilike(users.phone, term),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await database
    .select(clientJoinSelection())
    .from(appointments)
    .innerJoin(users, eq(appointments.clientId, users.id))
    .where(where)
    .orderBy(desc(appointments.startsOn), desc(appointments.startMinute))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const totalRows = await database
    .select({ value: count() })
    .from(appointments)
    .innerJoin(users, eq(appointments.clientId, users.id))
    .where(where);

  return {
    items: await decorate(database, rows),
    total: Number(totalRows[0]?.value ?? 0),
    page,
    pageSize,
  };
}

export type ClientSummary = User & {
  appointmentsCount: number;
  completedCount: number;
  lastVisit: string | null;
  totalSpentCents: number;
};

export async function getClients(
  options?: {
    db?: AppDb;
    query?: string;
    page?: number;
    pageSize?: number;
    includeInactive?: boolean;
  },
): Promise<{ items: ClientSummary[]; total: number; page: number; pageSize: number }> {
  const db = options?.db ?? (await getDb());
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, options?.pageSize ?? 20));

  const conditions = [eq(users.role, "client")];
  if (!options?.includeInactive) conditions.push(eq(users.isActive, true));
  if (options?.query?.trim()) {
    const term = `%${options.query.trim()}%`;
    const search = or(
      ilike(users.name, term),
      ilike(users.email, term),
      ilike(users.phone, term),
    );
    if (search) conditions.push(search);
  }
  const where = and(...conditions);

  const rows = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const totalRows = await db
    .select({ value: count() })
    .from(users)
    .where(where);

  const ids = rows.map((row) => row.id);
  const stats = new Map<
    string,
    { appointmentsCount: number; completedCount: number; totalSpentCents: number }
  >();

  if (ids.length > 0) {
    const grouped = await db
      .select({
        clientId: appointments.clientId,
        appointmentsCount: count(),
        completedCount: sql<number>`count(*) filter (where ${appointments.status} = 'completed')`,
        totalSpentCents: sql<number>`coalesce(sum(${appointments.totalPriceCents}) filter (where ${appointments.status} = 'completed'), 0)`,
      })
      .from(appointments)
      .where(inArray(appointments.clientId, ids))
      .groupBy(appointments.clientId);

    for (const row of grouped) {
      stats.set(row.clientId, {
        appointmentsCount: Number(row.appointmentsCount),
        completedCount: Number(row.completedCount),
        totalSpentCents: Number(row.totalSpentCents),
      });
    }
  }

  const lastVisits = new Map<string, string>();
  if (ids.length > 0) {
    const visits = await db
      .select({
        clientId: appointments.clientId,
        lastDay: sql<string>`max(${appointments.startsOn})`,
      })
      .from(appointments)
      .where(
        and(
          inArray(appointments.clientId, ids),
          eq(appointments.status, "completed"),
        ),
      )
      .groupBy(appointments.clientId);
    for (const visit of visits) {
      lastVisits.set(visit.clientId, visit.lastDay);
    }
  }

  const items = rows.map((row) => {
    const stat = stats.get(row.id);
    return {
      ...row,
      appointmentsCount: stat?.appointmentsCount ?? 0,
      completedCount: stat?.completedCount ?? 0,
      totalSpentCents: stat?.totalSpentCents ?? 0,
      lastVisit: lastVisits.get(row.id) ?? null,
    };
  });

  return {
    items,
    total: Number(totalRows[0]?.value ?? 0),
    page,
    pageSize,
  };
}

export async function getClientById(id: string, db?: AppDb) {
  const database = db ?? (await getDb());
  const rows = await database
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "client")))
    .limit(1);
  return rows[0] ?? null;
}

export type DashboardData = {
  now: SalonNow;
  todayLabel: string;
  today: {
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    completed: number;
    expectedRevenueCents: number;
  };
  month: {
    key: string;
    total: number;
    cancelled: number;
    completed: number;
    revenueRealizedCents: number;
    revenueExpectedCents: number;
    cancellationRate: number;
  };
  upcoming: AppointmentListItem[];
  topServices: { serviceName: string; count: number; revenueCents: number }[];
  daily: { day: string; label: string; total: number; revenueCents: number }[];
};

export async function getDashboardData(db?: AppDb): Promise<DashboardData> {
  const database = db ?? (await getDb());
  const settings = await getSettings(database);
  const now = getSalonNow(settings.timezone);
  const today = await getAppointmentsForDay(now.day, database);

  const monthDays = daysInMonth(monthKey(now.day));
  const monthRows = await database
    .select()
    .from(appointments)
    .where(
      and(
        gte(appointments.startsOn, monthDays[0]),
        lte(appointments.startsOn, monthDays[monthDays.length - 1]),
      ),
    );

  const monthTotal = monthRows.length;
  const monthCancelled = monthRows.filter(
    (row) => row.status === "cancelled",
  ).length;
  const monthCompleted = monthRows.filter(
    (row) => row.status === "completed",
  );
  const monthActive = monthRows.filter(
    (row) => row.status === "pending" || row.status === "confirmed",
  );

  const startChart = addDays(now.day, -13);
  const chartDays = Array.from({ length: 14 }, (_, index) =>
    addDays(startChart, index),
  );
  const chartRows = await database
    .select()
    .from(appointments)
    .where(
      and(
        gte(appointments.startsOn, startChart),
        lte(appointments.startsOn, now.day),
      ),
    );

  const daily = chartDays.map((day) => {
    const rows = chartRows.filter((row) => row.startsOn === day);
    return {
      day,
      label: formatDayShort(day).split(",")[0] ?? day.slice(8),
      total: rows.filter((row) => row.status !== "cancelled").length,
      revenueCents: rows
        .filter((row) => row.status === "completed")
        .reduce((total, row) => total + row.totalPriceCents, 0),
    };
  });

  const topRows = await database
    .select({
      serviceName: appointmentItems.serviceName,
      count: count(),
      revenueCents: sql<number>`coalesce(sum(${appointmentItems.priceCents}), 0)`,
    })
    .from(appointmentItems)
    .innerJoin(
      appointments,
      eq(appointmentItems.appointmentId, appointments.id),
    )
    .where(
      and(
        gte(appointments.startsOn, monthDays[0]),
        lte(appointments.startsOn, monthDays[monthDays.length - 1]),
        inArray(appointments.status, ["pending", "confirmed", "completed"]),
      ),
    )
    .groupBy(appointmentItems.serviceName)
    .orderBy(desc(count()))
    .limit(5);

  const upcoming = today
    .filter(
      (row) =>
        (row.status === "pending" || row.status === "confirmed") &&
        (row.endMinute > now.minute || row.startsOn > now.day),
    )
    .slice(0, 6);

  return {
    now,
    todayLabel: now.day,
    today: {
      total: today.filter((row) => row.status !== "cancelled").length,
      confirmed: today.filter((row) => row.status === "confirmed").length,
      pending: today.filter((row) => row.status === "pending").length,
      cancelled: today.filter((row) => row.status === "cancelled").length,
      completed: today.filter((row) => row.status === "completed").length,
      expectedRevenueCents: today
        .filter((row) => row.status === "pending" || row.status === "confirmed")
        .reduce((total, row) => total + row.totalPriceCents, 0),
    },
    month: {
      key: monthKey(now.day),
      total: monthTotal,
      cancelled: monthCancelled,
      completed: monthCompleted.length,
      revenueRealizedCents: monthCompleted.reduce(
        (total, row) => total + row.totalPriceCents,
        0,
      ),
      revenueExpectedCents: monthActive.reduce(
        (total, row) => total + row.totalPriceCents,
        0,
      ),
      cancellationRate: monthTotal > 0 ? monthCancelled / monthTotal : 0,
    },
    upcoming,
    topServices: topRows.map((row) => ({
      serviceName: row.serviceName,
      count: Number(row.count),
      revenueCents: Number(row.revenueCents),
    })),
    daily,
  };
}

export type ReportData = {
  from: string;
  to: string;
  items: AppointmentListItem[];
  summary: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    pending: number;
    confirmed: number;
    revenueCents: number;
    averageTicketCents: number;
  };
  byService: { serviceName: string; count: number; revenueCents: number }[];
  byDay: { day: string; count: number; revenueCents: number }[];
};

export async function getReport(
  from: string,
  to: string,
  db?: AppDb,
): Promise<ReportData> {
  const database = db ?? (await getDb());
  const items = await getAppointmentsBetween(from, to, database);

  const completed = items.filter((row) => row.status === "completed");
  const revenueCents = completed.reduce(
    (total, row) => total + row.totalPriceCents,
    0,
  );

  const serviceMap = new Map<string, { count: number; revenueCents: number }>();
  for (const appointment of items) {
    if (appointment.status === "cancelled") continue;
    for (const item of appointment.items) {
      const current = serviceMap.get(item.serviceName) ?? {
        count: 0,
        revenueCents: 0,
      };
      current.count += 1;
      current.revenueCents += item.priceCents;
      serviceMap.set(item.serviceName, current);
    }
  }

  const dayMap = new Map<string, { count: number; revenueCents: number }>();
  const totalDays = daysBetween(from, to);
  for (let index = 0; index <= totalDays; index += 1) {
    dayMap.set(addDays(from, index), { count: 0, revenueCents: 0 });
  }
  for (const appointment of items) {
    if (appointment.status === "cancelled") continue;
    const current = dayMap.get(appointment.startsOn) ?? {
      count: 0,
      revenueCents: 0,
    };
    current.count += 1;
    if (appointment.status === "completed") {
      current.revenueCents += appointment.totalPriceCents;
    }
    dayMap.set(appointment.startsOn, current);
  }

  return {
    from,
    to,
    items,
    summary: {
      total: items.length,
      completed: completed.length,
      cancelled: items.filter((row) => row.status === "cancelled").length,
      noShow: items.filter((row) => row.status === "no_show").length,
      pending: items.filter((row) => row.status === "pending").length,
      confirmed: items.filter((row) => row.status === "confirmed").length,
      revenueCents,
      averageTicketCents:
        completed.length > 0 ? Math.round(revenueCents / completed.length) : 0,
    },
    byService: [...serviceMap.entries()]
      .map(([serviceName, value]) => ({ serviceName, ...value }))
      .sort((a, b) => b.count - a.count),
    byDay: [...dayMap.entries()].map(([day, value]) => ({ day, ...value })),
  };
}

export async function getServicesForFilter(db?: AppDb) {
  const database = db ?? (await getDb());
  return database
    .select({ id: services.id, name: services.name, isActive: services.isActive })
    .from(services)
    .orderBy(asc(services.name));
}

export async function getBusinessHours(db?: AppDb) {
  const database = db ?? (await getDb());
  return database
    .select()
    .from(businessHours)
    .orderBy(asc(businessHours.weekday));
}

export async function getScheduleBlocks(
  from: string | null,
  db?: AppDb,
) {
  const database = db ?? (await getDb());
  return database
    .select()
    .from(scheduleBlocks)
    .where(from ? gte(scheduleBlocks.day, from) : undefined)
    .orderBy(asc(scheduleBlocks.day), asc(scheduleBlocks.startMinute));
}

export async function getBlocksBetween(
  from: string,
  to: string,
  db?: AppDb,
) {
  const database = db ?? (await getDb());
  return database
    .select()
    .from(scheduleBlocks)
    .where(and(gte(scheduleBlocks.day, from), lte(scheduleBlocks.day, to)))
    .orderBy(asc(scheduleBlocks.day), asc(scheduleBlocks.startMinute));
}

export async function getActiveClientsForSelect(db?: AppDb) {
  const database = db ?? (await getDb());
  return database
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
    })
    .from(users)
    .where(and(eq(users.role, "client"), eq(users.isActive, true)))
    .orderBy(asc(users.name))
    .limit(1000);
}

export type ClientStats = {
  appointmentsCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  totalSpentCents: number;
  lastVisit: string | null;
};

export async function getClientStats(
  clientId: string,
  db?: AppDb,
): Promise<ClientStats> {
  const database = db ?? (await getDb());
  const rows = await database
    .select({
      appointmentsCount: count(),
      completedCount: sql<number>`count(*) filter (where ${appointments.status} = 'completed')`,
      cancelledCount: sql<number>`count(*) filter (where ${appointments.status} = 'cancelled')`,
      noShowCount: sql<number>`count(*) filter (where ${appointments.status} = 'no_show')`,
      totalSpentCents: sql<number>`coalesce(sum(${appointments.totalPriceCents}) filter (where ${appointments.status} = 'completed'), 0)`,
    })
    .from(appointments)
    .where(eq(appointments.clientId, clientId));

  const row = rows[0];
  const lastVisitRows = await database
    .select({ lastDay: sql<string | null>`max(${appointments.startsOn})` })
    .from(appointments)
    .where(
      and(
        eq(appointments.clientId, clientId),
        eq(appointments.status, "completed"),
      ),
    );

  return {
    appointmentsCount: Number(row?.appointmentsCount ?? 0),
    completedCount: Number(row?.completedCount ?? 0),
    cancelledCount: Number(row?.cancelledCount ?? 0),
    noShowCount: Number(row?.noShowCount ?? 0),
    totalSpentCents: Number(row?.totalSpentCents ?? 0),
    lastVisit: lastVisitRows[0]?.lastDay ?? null,
  };
}

export async function getRecentAuditLogs(limit = 12, db?: AppDb) {
  const database = db ?? (await getDb());
  return database
    .select({
      id: adminAuditLogs.id,
      action: adminAuditLogs.action,
      entity: adminAuditLogs.entity,
      entityId: adminAuditLogs.entityId,
      details: adminAuditLogs.details,
      createdAt: adminAuditLogs.createdAt,
      actorName: users.name,
    })
    .from(adminAuditLogs)
    .leftJoin(users, eq(adminAuditLogs.actorId, users.id))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit);
}
