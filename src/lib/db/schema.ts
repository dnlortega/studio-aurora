import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Modelo relacional do Studio Aurora.
 *
 * Decisões importantes:
 * - Datas de agenda são armazenadas como data local do salão (YYYY-MM-DD) e
 *   minutos desde a meia-noite. Isso elimina ambiguidades de fuso horário: o
 *   expediente é sempre interpretado no fuso configurado em `settings.timezone`.
 * - Itens de agendamento guardam cópia de nome, preço e duração do serviço,
 *   preservando o histórico mesmo que o serviço seja editado ou desativado.
 * - Serviços nunca são apagados quando já possuem histórico: a aplicação
 *   desativa o registro (isActive = false).
 */

export const userRole = pgEnum("user_role", ["client", "admin"]);
export const appointmentStatus = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);
export const paymentStatus = pgEnum("payment_status", ["unpaid", "paid"]);
export const notificationChannel = pgEnum("notification_channel", [
  "email",
  "whatsapp",
]);
export const notificationStatus = pgEnum("notification_status", [
  "queued",
  "sent",
  "failed",
  "not_configured",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("client"),
    isActive: boolean("is_active").notNull().default(true),
    notifyEmail: boolean("notify_email").notNull().default(true),
    notifyWhatsapp: boolean("notify_whatsapp").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(sql`lower(${table.email})`),
    index("users_role_idx").on(table.role),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 do token entregue no cookie — o token em si nunca é gravado. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    /** SHA-256 do token enviado ao usuário. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("reset_tokens_user_idx").on(table.userId)],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    durationMin: integer("duration_min").notNull(),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("services_slug_unique").on(table.slug),
    index("services_active_idx").on(table.isActive),
  ],
);

export const businessHours = pgTable(
  "business_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** 0 = domingo, 1 = segunda ... 6 = sábado (horário local do salão). */
    weekday: integer("weekday").notNull(),
    isOpen: boolean("is_open").notNull().default(false),
    openMinute: integer("open_minute").notNull().default(540),
    closeMinute: integer("close_minute").notNull().default(1140),
    breakStartMinute: integer("break_start_minute"),
    breakEndMinute: integer("break_end_minute"),
  },
  (table) => [uniqueIndex("business_hours_weekday_unique").on(table.weekday)],
);

export const scheduleBlocks = pgTable(
  "schedule_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    day: date("day", { mode: "string" }).notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("schedule_blocks_day_idx").on(table.day)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Data local do salão (YYYY-MM-DD). */
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    status: appointmentStatus("status").notNull().default("pending"),
    totalPriceCents: integer("total_price_cents").notNull(),
    totalDurationMin: integer("total_duration_min").notNull(),
    notes: text("notes"),
    paymentStatus: paymentStatus("payment_status").notNull().default("unpaid"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("appointments_day_idx").on(table.startsOn, table.startMinute),
    index("appointments_client_idx").on(table.clientId),
    index("appointments_status_idx").on(table.status),
  ],
);

export const appointmentItems = pgTable(
  "appointment_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    /** Cópia do serviço no momento da reserva. */
    serviceName: text("service_name").notNull(),
    priceCents: integer("price_cents").notNull(),
    durationMin: integer("duration_min").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("appointment_items_appointment_idx").on(table.appointmentId),
  ],
);

export const appointmentHistory = pgTable(
  "appointment_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("appointment_history_appointment_idx").on(table.appointmentId),
  ],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("admin_audit_created_idx").on(table.createdAt)],
);

export const settings = pgTable("settings", {
  /** Linha única (id = 1) com a configuração do salão. */
  id: integer("id").primaryKey().default(1),
  salonName: text("salon_name").notNull().default("Studio Aurora"),
  tagline: text("tagline").notNull().default("Unhas cuidadas no seu tempo."),
  description: text("description"),
  address: text("address"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  instagram: text("instagram"),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  slotGranularityMin: integer("slot_granularity_min").notNull().default(30),
  minLeadMinutes: integer("min_lead_minutes").notNull().default(120),
  maxLeadDays: integer("max_lead_days").notNull().default(60),
  cancelMinHours: integer("cancel_min_hours").notNull().default(24),
  rescheduleMinHours: integer("reschedule_min_hours").notNull().default(24),
  maxServicesPerBooking: integer("max_services_per_booking")
    .notNull()
    .default(3),
  autoConfirm: boolean("auto_confirm").notNull().default(true),
  publicNotice: text("public_notice"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Trava por dia usada para serializar reservas concorrentes.
 * `SELECT ... FOR UPDATE` nesta linha dentro da transação garante que duas
 * pessoas não confirmem o mesmo horário ao mesmo tempo.
 */
export const appointmentDayLocks = pgTable("appointment_day_locks", {
  day: date("day", { mode: "string" }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "cascade",
    }),
    channel: notificationChannel("channel").notNull(),
    status: notificationStatus("status").notNull().default("queued"),
    type: text("type").notNull(),
    payload: text("payload"),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("notifications_appointment_idx").on(table.appointmentId)],
);

export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type AppointmentItem = typeof appointmentItems.$inferSelect;
export type BusinessHour = typeof businessHours.$inferSelect;
export type ScheduleBlock = typeof scheduleBlocks.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AppointmentHistoryEntry = typeof appointmentHistory.$inferSelect;
