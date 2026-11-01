import path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

import { createDatabase } from "@/lib/db";
import type { AppDb } from "@/lib/db";
import {
  businessHours,
  settings,
  users,
  type Service,
  type User,
} from "@/lib/db/schema";
import { seedCatalog } from "../../scripts/seed-data";

export type TestContext = {
  db: AppDb;
  services: Service[];
  admin: User;
  clientA: User;
  clientB: User;
  close: () => Promise<void>;
};

/**
 * Banco PostgreSQL embutido (PGlite) isolado por arquivo de teste. As migrations
 * reais são aplicadas, então as constraints e índices são os mesmos do banco de
 * produção.
 */
export async function createTestContext(): Promise<TestContext> {
  const dataDir = mkdtempSync(path.join(tmpdir(), "aurora-test-"));
  const created = await createDatabase({ dataDir, autoMigrate: true });

  await created.db
    .update(settings)
    .set({
      timezone: "America/Sao_Paulo",
      slotGranularityMin: 30,
      minLeadMinutes: 0,
      maxLeadDays: 60,
      cancelMinHours: 24,
      rescheduleMinHours: 24,
      maxServicesPerBooking: 3,
      autoConfirm: true,
    });

  // Todos os dias abertos para que os testes não dependam do dia da semana.
  await created.db.update(businessHours).set({
    isOpen: true,
    openMinute: 9 * 60,
    closeMinute: 19 * 60,
    breakStartMinute: null,
    breakEndMinute: null,
  });

  await seedCatalog(created.db);
  const catalog = await created.db.query.services.findMany();
  const ordered = catalog.sort((a, b) => a.sortOrder - b.sortOrder);

  const [admin, clientA, clientB] = await created.db
    .insert(users)
    .values([
      {
        name: "Admin Teste",
        email: `admin-${Date.now()}@teste.local`,
        passwordHash: "hash-de-teste",
        role: "admin",
      },
      {
        name: "Cliente A",
        email: `a-${Date.now()}@teste.local`,
        passwordHash: "hash-de-teste",
        role: "client",
        phone: "11999990000",
      },
      {
        name: "Cliente B",
        email: `b-${Date.now()}@teste.local`,
        passwordHash: "hash-de-teste",
        role: "client",
        phone: "11999991111",
      },
    ])
    .returning();

  return {
    db: created.db,
    services: ordered,
    admin,
    clientA,
    clientB,
    close: async () => {
      await created.close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

export function serviceByName(context: TestContext, name: string): Service {
  const service = context.services.find((item) => item.name === name);
  if (!service) throw new Error(`Serviço não encontrado no seed: ${name}`);
  return service;
}
