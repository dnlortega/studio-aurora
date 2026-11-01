import { createDatabase } from "@/lib/db";

async function main() {
  const created = await createDatabase({ autoMigrate: true });
  console.log(
    `Migrações aplicadas com sucesso no PostgreSQL em ${created.info.target}.`,
  );
  await created.close();
}

main().catch((error) => {
  console.error("Falha ao aplicar migrações:", error);
  process.exit(1);
});
