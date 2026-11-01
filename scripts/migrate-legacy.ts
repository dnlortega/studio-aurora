import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

import { createDatabase } from "@/lib/db";

/**
 * Migra o banco antigo (Prisma: users/services/bookings/availabilities)
 * para o schema do Studio Aurora.
 *
 * - Faz backup dos dados antigos em .data/backups antes de tocar em nada.
 * - Renomeia as tabelas antigas para legacy_* (não apaga nada).
 * - Aplica as migrações Drizzle e converte os registros.
 * - Preserva os hashes bcrypt; o login troca para scrypt automaticamente.
 *
 * Uso: DATABASE_URL="postgresql://..." npm run db:migrate:legacy
 */

const LEGACY_TABLES = [
  "users",
  "services",
  "availabilities",
  "bookings",
  "work_schedules",
] as const;

const STATUS_MAP: Record<string, string> = {
  CONFIRMADO: "confirmed",
  CONFIRMADA: "confirmed",
  PENDENTE: "pending",
  CANCELADO: "cancelled",
  CANCELADA: "cancelled",
  CONCLUIDO: "completed",
  CONCLUÍDO: "completed",
  CONCLUIDA: "completed",
  CONCLUÍDA: "completed",
  FALTOU: "no_show",
  NO_SHOW: "no_show",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function parseTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

async function tableExists(sql: postgres.Sql, name: string) {
  const rows = await sql`select to_regclass(${"public." + name}) as reg`;
  return Boolean(rows[0]?.reg);
}

async function columnExists(
  sql: postgres.Sql,
  table: string,
  column: string,
) {
  const rows = await sql`
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = ${table} and column_name = ${column}
    limit 1
  `;
  return rows.length > 0;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Defina DATABASE_URL para migrar o banco remoto.");
  }

  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    const legacy = await columnExists(sql, "services", "durationMins");
    const current = await columnExists(sql, "services", "slug");

    if (legacy) {
      const backup: Record<string, unknown> = {};
      for (const table of LEGACY_TABLES) {
        if (await tableExists(sql, table)) {
          backup[table] = await sql.unsafe(`select * from public."${table}"`);
        }
      }
      mkdirSync(path.join(process.cwd(), ".data", "backups"), {
        recursive: true,
      });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const file = path.join(
        process.cwd(),
        ".data",
        "backups",
        `neon-legado-${stamp}.json`,
      );
      writeFileSync(file, JSON.stringify(backup, null, 2));
      console.log(`Backup local criado: ${file}`);

      await sql.begin(async (tx) => {
        for (const table of LEGACY_TABLES) {
          if (!(await tableExists(tx as unknown as postgres.Sql, table))) {
            continue;
          }
          const legacyName = `legacy_${table}`;
          if (await tableExists(tx as unknown as postgres.Sql, legacyName)) {
            continue;
          }
          await tx.unsafe(
            `ALTER TABLE "public"."${table}" RENAME TO "${legacyName}"`,
          );
        }
      });
      console.log("Tabelas antigas preservadas como legacy_*.");
    } else if (current) {
      console.log("Schema do Studio Aurora já existe neste banco.");
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  // Cria/atualiza o schema novo e os registros padrão (configurações, horários).
  const created = await createDatabase({ databaseUrl, autoMigrate: true });
  await created.close();

  const db = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    const hasLegacyUsers = await tableExists(db, "legacy_users");
    if (!hasLegacyUsers) {
      console.log("Nenhuma tabela legacy_users encontrada; nada a converter.");
      return;
    }

    const existingUsers = await db`select count(*)::int as total from users`;
    if (existingUsers[0].total > 0) {
      console.log(
        `Já existem ${existingUsers[0].total} usuários no schema novo. Conversão de dados ignorada.`,
      );
      return;
    }

    const userIds = new Map<string, string>();
    const legacyUsers = await db`
      select id, name, email, password, phone, role, blocked, "createdAt", "updatedAt"
      from legacy_users
      order by "createdAt"
    `;

    for (const row of legacyUsers) {
      const id = randomUUID();
      await db`
        insert into users (id, name, email, phone, password_hash, role, is_active, notify_email, notify_whatsapp, created_at, updated_at)
        values (
          ${id},
          ${row.name},
          ${String(row.email).toLowerCase()},
          ${row.phone || null},
          ${row.password},
          ${String(row.role).toUpperCase() === "ADMIN" ? "admin" : "client"},
          ${!row.blocked},
          true,
          false,
          ${toDate(row.createdAt)},
          ${toDate(row.updatedAt)}
        )
      `;
      userIds.set(String(row.id), id);
    }
    console.log(`Usuários migrados: ${userIds.size}`);

    const serviceIds = new Map<string, string>();
    const slugs = new Set<string>();
    const legacyServices = await db`
      select id, name, description, price, "durationMins", active, "createdAt", "updatedAt"
      from legacy_services
      order by "createdAt"
    `;

    for (const [index, row] of legacyServices.entries()) {
      const id = randomUUID();
      const base = slugify(String(row.name)) || `servico-${index + 1}`;
      let slug = base;
      let suffix = 2;
      while (slugs.has(slug)) {
        slug = `${base}-${suffix++}`;
      }
      slugs.add(slug);

      await db`
        insert into services (id, name, slug, description, price_cents, duration_min, is_active, sort_order, created_at, updated_at)
        values (
          ${id},
          ${row.name},
          ${slug},
          ${row.description},
          ${Math.round(Number(row.price) * 100)},
          ${row.durationMins},
          ${row.active},
          ${index},
          ${toDate(row.createdAt)},
          ${toDate(row.updatedAt)}
        )
      `;
      serviceIds.set(String(row.id), id);
    }
    console.log(`Serviços migrados: ${serviceIds.size}`);

    const legacyBookings = await db`
      select
        b.id, b."userId", b.status, b.notes, b."createdAt", b."updatedAt",
        to_char(a.date, 'YYYY-MM-DD') as day,
        a."startTime", a."endTime", a."serviceId"
      from legacy_bookings b
      join legacy_availabilities a on a.id = b."availabilityId"
      order by a.date, a."startTime"
    `;

    let imported = 0;
    for (const row of legacyBookings) {
      const clientId = userIds.get(String(row.userId));
      if (!clientId) continue;

      const startMinute = parseTime(String(row.startTime));
      const endMinute = parseTime(String(row.endTime));
      const duration = Math.max(0, endMinute - startMinute);
      const serviceId = row.serviceId
        ? (serviceIds.get(String(row.serviceId)) ?? null)
        : null;
      const service = serviceId
        ? legacyServices.find((item) => String(item.id) === String(row.serviceId))
        : undefined;
      const priceCents = service
        ? Math.round(Number(service.price) * 100)
        : 0;
      const serviceName = service ? String(service.name) : "Atendimento";
      const status = STATUS_MAP[String(row.status).toUpperCase()] ?? "pending";

      const appointmentId = randomUUID();
      await db`
        insert into appointments (
          id, client_id, starts_on, start_minute, end_minute, status,
          total_price_cents, total_duration_min, notes, payment_status,
          created_at, updated_at
        ) values (
          ${appointmentId},
          ${clientId},
          ${row.day},
          ${startMinute},
          ${endMinute},
          ${status},
          ${priceCents},
          ${duration},
          ${row.notes},
          'unpaid',
          ${toDate(row.createdAt)},
          ${toDate(row.updatedAt)}
        )
      `;

      if (serviceId) {
        await db`
          insert into appointment_items (appointment_id, service_id, service_name, price_cents, duration_min, sort_order)
          values (${appointmentId}, ${serviceId}, ${serviceName}, ${priceCents}, ${service ? service.durationMins : duration}, 0)
        `;
      }

      await db`
        insert into appointment_history (appointment_id, actor_name, action, details, created_at)
        values (
          ${appointmentId},
          'Migração',
          'imported',
          'Agendamento importado do sistema anterior (Prisma).',
          ${toDate(row.createdAt)}
        )
      `;
      imported += 1;
    }

    console.log(`Agendamentos migrados: ${imported}`);
    const counts = await db`
      select
        (select count(*)::int from users) as users,
        (select count(*)::int from services) as services,
        (select count(*)::int from appointments) as appointments
    `;
    console.log("Totais no schema novo:", counts[0]);
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Falha na migração:", error);
  process.exit(1);
});
