import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import {
  addDaysToNow,
  createBooking,
  getActiveServices,
  resolveAvailability,
} from "@/lib/booking/service";
import { getSalonNow, minutesToTime } from "@/lib/dates";
import { createDatabase } from "@/lib/db";
import { appointments, settings } from "@/lib/db/schema";
import { ensureUser, seedCatalog } from "./seed-data";

/**
 * Seed idempotente: cria serviços do catálogo e dados públicos do salão.
 *
 * Nenhuma senha de demonstração vem de arquivo de ambiente. Senha só existe no
 * banco, como hash; para criar uma conta de demonstração o seed gera uma senha
 * forte na hora, mostra uma única vez no terminal e esquece o valor. Para
 * entrar depois, use o botão “Entrar como” na tela de acesso (existe só em
 * desenvolvimento) ou `npm run admin:create`, que é o caminho do produção.
 *
 * - admin de demonstração: criado quando `SEED_ADMIN_EMAIL` está definido
 *   (`SEED_ADMIN_NAME` opcional);
 * - cliente de demonstração: criada quando `SEED_CLIENT_EMAIL` está definido
 *   (`SEED_CLIENT_NAME` opcional);
 * - agendamentos de exemplo: criados quando a conta de demonstração ainda não
 *   tem nenhum e `SEED_DEMO_APPOINTMENTS` não está como `false`, o que mantém o
 *   seed idempotente.
 */

const DEMO_NOTES = "Agendamento de demonstração criado pelo seed.";

/** Senha de trabalho: forte, efêmera e mostrada uma única vez. */
function generatedPassword(): string {
  return randomBytes(24).toString("base64url");
}

async function main() {
  const created = await createDatabase({ autoMigrate: true });
  const { db } = created;

  try {
    const servicesCreated = await seedCatalog(db);

    const current = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 1))
      .limit(1);

    if (current[0]) {
      const row = current[0];
      await db
        .update(settings)
        .set({
          description:
            row.description ??
            "Studio de beleza autoral em São Paulo. Cortes, cor, cuidados e ocasiões especiais com agenda organizada e atendimento individual.",
          address: row.address ?? "Rua Harmonia, 402 — Vila Madalena, São Paulo/SP",
          phone: row.phone ?? "(11) 3030-1414",
          whatsapp: row.whatsapp ?? "5511930301414",
          email: row.email ?? "contato@studioaurora.com.br",
          instagram: row.instagram ?? "@studioaurora",
          publicNotice:
            row.publicNotice ??
            "Atendimento por hora marcada. Chegue com 10 minutos de antecedência para aproveitar o café da casa.",
          updatedAt: new Date(),
        })
        .where(eq(settings.id, 1));
    }

    const demoPasswords: string[] = [];

    const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
    let adminMessage = "Admin de demonstração não criado (SEED_ADMIN_EMAIL ausente).";
    if (adminEmail) {
      const adminName = process.env.SEED_ADMIN_NAME?.trim() || "Administrador";
      const password = generatedPassword();
      const result = await ensureUser(db, {
        name: adminName,
        email: adminEmail,
        password,
        role: "admin",
        updatePassword: false,
      });
      adminMessage = result.created
        ? `Admin criado: ${adminEmail}`
        : result.updated
          ? `Admin já existia; senha preservada: ${adminEmail}`
          : `Admin já existia: ${adminEmail}`;
      if (result.created) demoPasswords.push(`  admin  ${adminEmail}  ${password}`);
    }

    const clientEmail = process.env.SEED_CLIENT_EMAIL?.trim();
    const clientName = process.env.SEED_CLIENT_NAME?.trim() || "Cliente de demonstração";

    let clientMessage = "Cliente de demonstração não criada (SEED_CLIENT_EMAIL ausente).";
    let demoClientId: string | null = null;
    if (clientEmail) {
      const password = generatedPassword();
      const result = await ensureUser(db, {
        name: clientName,
        email: clientEmail,
        password,
        role: "client",
        phone: "(11) 99999-0000",
        updatePassword: false,
      });
      demoClientId = result.id;
      clientMessage = result.created
        ? `Cliente de demonstração criada: ${clientEmail}`
        : `Cliente de demonstração já existia: ${clientEmail}`;
      if (result.created) demoPasswords.push(`  cliente ${clientEmail}  ${password}`);
    }

    const wantsDemoAppointments =
      process.env.SEED_DEMO_APPOINTMENTS !== "false";
    const demoAppointments = !demoClientId
      ? "nenhum (sem SEED_CLIENT_EMAIL)"
      : !wantsDemoAppointments
        ? "desativado (SEED_DEMO_APPOINTMENTS=false)"
        : await seedDemoAppointments(db, demoClientId, clientName);

    console.log(`Serviços criados: ${servicesCreated}.`);
    console.log(adminMessage);
    console.log(clientMessage);
    console.log(`Agendamentos de exemplo: ${demoAppointments}`);
    if (demoPasswords.length > 0) {
      console.log(
        [
          "",
          "Senhas geradas agora e mostradas agora — não ficam em arquivo nenhum:",
          ...demoPasswords,
          "Elas não se repetem em outra execução e não são necessárias para",
          "entrar: em desenvolvimento a tela de acesso tem o botão “Entrar como”.",
        ].join("\n"),
      );
    }
  } finally {
    await created.close();
  }
}

/**
 * Reserva até dois horários futuros reais para a cliente de demonstração,
 * passando pelo mesmo motor de disponibilidade usado na interface — nunca um
 * horário inventado que colida com a agenda.
 */
async function seedDemoAppointments(
  db: Awaited<ReturnType<typeof createDatabase>>["db"],
  clientId: string,
  clientName: string,
): Promise<string> {
  const already = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(eq(appointments.clientId, clientId))
    .limit(1);

  if (already.length > 0) {
    return "já existiam agendamentos para esta conta; nada foi criado";
  }

  const catalog = await getActiveServices(db);
  if (catalog.length === 0) return "nenhum (catálogo vazio)";

  const settingRows = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);
  const timezone = settingRows[0]?.timezone ?? "America/Sao_Paulo";
  const now = getSalonNow(timezone);

  const plans = [
    { service: catalog[0], status: "confirmed" as const },
    { service: catalog[1] ?? catalog[0], status: "pending" as const },
  ];

  const created: string[] = [];
  for (const plan of plans) {
    for (let offset = 1; offset <= 14; offset += 1) {
      const day = addDaysToNow(now, offset).day;
      const availability = await resolveAvailability({
        db,
        day,
        serviceIds: [plan.service.id],
        now,
      });
      const slot =
        availability.slots[Math.floor(availability.slots.length / 2)];
      if (slot === undefined) continue;

      await createBooking({
        db,
        actor: { id: clientId, name: clientName, role: "client" },
        clientId,
        day,
        startMinute: slot,
        serviceIds: [plan.service.id],
        notes: DEMO_NOTES,
        initialStatus: plan.status,
      });
      created.push(`${minutesToTime(slot)} de ${day} (${plan.service.name})`);
      break;
    }
  }

  return created.length > 0
    ? `${created.length} criado(s): ${created.join(" · ")}`
    : "nenhum (sem horários livres nos próximos 14 dias)";
}

main().catch((error) => {
  console.error("Falha no seed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
