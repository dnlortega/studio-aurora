import { eq } from "drizzle-orm";

import { createDatabase } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { ensureUser, seedCatalog } from "./seed-data";

/**
 * Seed idempotente: cria serviços do catálogo e dados públicos do salão.
 *
 * O administrador de demonstração SÓ é criado se SEED_ADMIN_NAME,
 * SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD estiverem definidos. Em produção,
 * prefira `npm run admin:create`.
 */
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

    const adminName = process.env.SEED_ADMIN_NAME?.trim();
    const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;

    let adminMessage = "Admin de demonstração não criado (SEED_ADMIN_* ausentes).";
    if (adminName && adminEmail && adminPassword) {
      if (adminPassword.length < 8) {
        throw new Error("SEED_ADMIN_PASSWORD deve ter pelo menos 8 caracteres.");
      }
      const result = await ensureUser(db, {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        updatePassword: false,
      });
      adminMessage = result.created
        ? `Admin criado: ${adminEmail}`
        : `Admin já existia: ${adminEmail}`;
    }

    console.log(`Serviços criados: ${servicesCreated}.`);
    console.log(adminMessage);
    console.log(
      "Seed concluído. Nenhum agendamento fictício foi gerado; a agenda começa vazia.",
    );
  } finally {
    await created.close();
  }
}

main().catch((error) => {
  console.error("Falha no seed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
