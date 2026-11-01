import { rmSync } from "node:fs";
import path from "node:path";

import { createDatabase } from "@/lib/db";
import { E2E_USERS } from "./e2e-users";
import { ensureUser, seedCatalog } from "./seed-data";

/**
 * Recria o banco local usado pelos testes E2E (Playwright).
 *
 * - Usa PGlite em E2E_PGLITE_DIR (padrão: .data/e2e).
 * - Recusa rodar se DATABASE_URL estiver definida, para nunca apagar um banco
 *   remoto por acidente.
 */

async function main() {
  if (process.env.DATABASE_URL?.trim()) {
    console.error(
      "Recusando reset: DATABASE_URL está definida. Os testes E2E usam apenas o banco local PGlite.",
    );
    process.exit(1);
  }

  const dataDir = process.env.E2E_PGLITE_DIR ?? ".data/e2e";
  rmSync(path.resolve(process.cwd(), dataDir), {
    recursive: true,
    force: true,
  });

  const created = await createDatabase({ dataDir, autoMigrate: true });
  const { db } = created;

  try {
    await seedCatalog(db);
    await ensureUser(db, { ...E2E_USERS.admin, role: "admin" });
    await ensureUser(db, { ...E2E_USERS.client, role: "client" });
    await ensureUser(db, { ...E2E_USERS.otherClient, role: "client" });

    console.log(`Banco E2E recriado em ${dataDir}.`);
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
