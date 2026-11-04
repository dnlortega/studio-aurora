import { inArray, eq } from "drizzle-orm";

import { createDatabase } from "@/lib/db";
import {
  appointmentHistory,
  appointmentItems,
  appointments,
  services,
  settings,
} from "@/lib/db/schema";
import {
  CATALOG,
  DEMO_NOTES,
  LEGACY_PROFILE_VALUES,
  STUDIO_PROFILE,
  seedCatalog,
} from "./seed-data";
import { describeDatabaseTarget, loadEnvFile } from "./load-env";

/**
 * Alinha o banco ao cardápio de unhas definido em `scripts/seed-data.ts`.
 *
 *   npm run db:sync-catalog            aplica
 *   npm run db:sync-catalog -- --dry-run   só mostra o que seria feito
 *
 * Regras que protegem os dados do salão:
 * - Serviços fora do cardápio são removidos, mas o histórico antigo é
 *   preservado: `appointment_items` guarda nome, preço e duração no momento da
 *   reserva e a chave para o serviço apenas vira nula (`onDelete: "set null"`).
 * - Agendamentos de demonstração (marcados com a nota do seed) que usam um
 *   serviço excluído são apagados, porque são dados de exemplo — não registros
 *   reais. O `npm run db:seed` recria esses exemplos no cardápio novo.
 * - Textos do salão só são substituídos enquanto forem exatamente os textos
 *   padrão antigos; qualquer edição feita no painel permanece intacta.
 */

const dryRun = process.argv.includes("--dry-run");

async function main() {
  loadEnvFile(".env.local");
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Rode com o arquivo .env.local presente.",
    );
  }

  const created = await createDatabase({ databaseUrl: url, autoMigrate: false });
  const { db } = created;

  try {
    console.log(
      dryRun
        ? `Simulação — nada será gravado em ${describeDatabaseTarget(url)}.`
        : `Aplicando em ${describeDatabaseTarget(url)}.`,
    );

    const keptSlugs: string[] = CATALOG.map((item) => item.slug);
    const all = await db
      .select({ id: services.id, slug: services.slug, name: services.name })
      .from(services);

    const prunable = all.filter((row) => !keptSlugs.includes(row.slug));
    const known = all.filter((row) => keptSlugs.includes(row.slug));

    console.log(
      `Cardápio: ${known.length} de ${CATALOG.length} serviços já existem; ${prunable.length} fora do cardápio.`,
    );

    if (prunable.length > 0) {
      const ids = prunable.map((row) => row.id);

      const referencing = await db
        .select({
          appointmentId: appointmentItems.appointmentId,
          serviceName: appointmentItems.serviceName,
          notes: appointments.notes,
        })
        .from(appointmentItems)
        .innerJoin(appointments, eq(appointments.id, appointmentItems.appointmentId))
        .where(inArray(appointmentItems.serviceId, ids));

      const demoAppointmentIds = [
        ...new Set(
          referencing
            .filter((row) => row.notes === DEMO_NOTES)
            .map((row) => row.appointmentId),
        ),
      ];
      const realSnapshots = referencing.filter(
        (row) => row.notes !== DEMO_NOTES,
      );

      if (demoAppointmentIds.length > 0) {
        console.log(
          `Agendamentos de demonstração a apagar: ${demoAppointmentIds.length}.`,
        );
        if (!dryRun) {
          await db
            .delete(appointmentHistory)
            .where(inArray(appointmentHistory.appointmentId, demoAppointmentIds));
          await db
            .delete(appointmentItems)
            .where(inArray(appointmentItems.appointmentId, demoAppointmentIds));
          await db
            .delete(appointments)
            .where(inArray(appointments.id, demoAppointmentIds));
        }
      }

      if (realSnapshots.length > 0) {
        console.log(
          `Histórico real mantido: ${realSnapshots.length} item(ns) de agendamento conservam nome, preço e duração; só a referência ao serviço some.`,
        );
      }

      if (!dryRun) {
        await db.delete(services).where(inArray(services.id, ids));
        console.log(
          `Serviços removidos: ${prunable.map((row) => row.name).join(", ")}.`,
        );
      } else {
        console.log(
          `Removeria: ${prunable.map((row) => row.name).join(", ")}.`,
        );
      }
    }

    if (!dryRun) {
      const inserted = await seedCatalog(db);
      console.log(
        inserted > 0
          ? `Serviços criados: ${inserted} (${CATALOG.map((item) => item.name).join(", ")}).`
          : "Nenhum serviço novo necessário.",
      );
    } else {
      console.log(
        `Criaria os que faltam entre: ${CATALOG.map((item) => item.name).join(", ")}.`,
      );
    }

    await syncProfile(db);
  } finally {
    await created.close();
  }
}

/** Substitui apenas os textos padrão antigos; edição do painel nunca é tocada.  */
async function syncProfile(
  db: Awaited<ReturnType<typeof createDatabase>>["db"],
) {
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  const current = rows[0];
  if (!current) return;

  const replaceable = (value: string | null, next: string) =>
    value === null || value === next
      ? null
      : LEGACY_PROFILE_VALUES.includes(value)
        ? next
        : null;

  const patch: Record<string, string> = {};
  for (const key of ["tagline", "description", "publicNotice"] as const) {
    const next = replaceable(current[key], STUDIO_PROFILE[key]);
    if (next) patch[key] = next;
  }

  if (Object.keys(patch).length === 0) {
    console.log("Textos do salão: nada a trocar (já atuais ou editados no painel).");
    return;
  }

  if (dryRun) {
    console.log(`Atualizaria os textos: ${Object.keys(patch).join(", ")}.`);
    return;
  }

  await db
    .update(settings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(settings.id, 1));
  console.log(`Textos atualizados: ${Object.keys(patch).join(", ")}.`);
}

main().catch((error) => {
  console.error(
    "Falha ao alinhar o catálogo:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
