import { createDatabase } from "@/lib/db";
import { E2E_USERS } from "./e2e-users";
import {
  describeDatabaseTarget,
  resetTestDatabase,
} from "./neon-test-db";
import { ensureUser, seedCatalog } from "./seed-data";

/**
 * Recria o banco de testes ponta a ponta na Neon (`aurora_e2e`).
 *
 * O banco é separado do banco do salão, então zerar o estado dos testes nunca
 * apaga agendamento real. A guard está em `neon-test-db.ts`: se a URL apontar
 * para qualquer outro banco, o script recusa e sai sem conectar.
 */
async function main() {
  const url = await resetTestDatabase("e2e");
  const created = await createDatabase({ databaseUrl: url, autoMigrate: false });
  const { db } = created;

  try {
    await seedCatalog(db);
    await ensureUser(db, { ...E2E_USERS.admin, role: "admin" });
    await ensureUser(db, { ...E2E_USERS.client, role: "client" });
    await ensureUser(db, { ...E2E_USERS.otherClient, role: "client" });

    console.log(`Banco E2E recriado em ${describeDatabaseTarget(url)} (Neon).`);
    console.log(
      `Admin: ${E2E_USERS.admin.email} · Cliente: ${E2E_USERS.client.email} · Outro: ${E2E_USERS.otherClient.email}`,
    );
  } finally {
    await created.close();
  }
}

main().catch((error) => {
  console.error("Falha ao preparar banco E2E:", error);
  process.exit(1);
});
