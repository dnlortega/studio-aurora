import path from "node:path";
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "./schema";

export type AppDb = PgliteDatabase<typeof schema>;

/**
 * Descrição pública do banco em uso, sem credenciais. Usada pelo painel de
 * status (`/admin/status`) e por diagnósticos.
 */
export type DbRuntimeInfo = {
  driver: "pglite" | "postgres";
  /**
   * `host:porta/base` quando há DATABASE_URL (usuário e senha são removidos)
   * ou o diretório local quando o banco é o PGlite embutido.
   */
  target: string;
  startedAt: Date;
  autoMigrate: boolean;
};

type DbGlobal = typeof globalThis & {
  __studioAuroraDb?: Promise<AppDb>;
  __studioAuroraClient?: { close: () => Promise<void> | void };
  __studioAuroraInfo?: DbRuntimeInfo;
};

const globalForDb = globalThis as DbGlobal;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

function shouldAutoMigrate(hasUrl: boolean) {
  const flag = process.env.DB_AUTO_MIGRATE;
  if (flag === "false") return false;
  if (flag === "true") return true;
  // Sem URL = banco embutido de desenvolvimento: migra sempre.
  return !hasUrl;
}

async function ensureDefaults(db: AppDb) {
  await db
    .insert(schema.settings)
    .values({ id: 1 })
    .onConflictDoNothing({ target: schema.settings.id });

  const existingHours = await db.select().from(schema.businessHours);
  if (existingHours.length > 0) return;

  const defaults = [
    { weekday: 0, isOpen: false, openMinute: 540, closeMinute: 1080 },
    { weekday: 1, isOpen: false, openMinute: 540, closeMinute: 1140 },
    {
      weekday: 2,
      isOpen: true,
      openMinute: 540,
      closeMinute: 1140,
      breakStartMinute: 720,
      breakEndMinute: 780,
    },
    {
      weekday: 3,
      isOpen: true,
      openMinute: 540,
      closeMinute: 1140,
      breakStartMinute: 720,
      breakEndMinute: 780,
    },
    {
      weekday: 4,
      isOpen: true,
      openMinute: 540,
      closeMinute: 1140,
      breakStartMinute: 720,
      breakEndMinute: 780,
    },
    {
      weekday: 5,
      isOpen: true,
      openMinute: 540,
      closeMinute: 1140,
      breakStartMinute: 720,
      breakEndMinute: 780,
    },
    {
      weekday: 6,
      isOpen: true,
      openMinute: 540,
      closeMinute: 1080,
      breakStartMinute: 720,
      breakEndMinute: 780,
    },
  ];

  await db.insert(schema.businessHours).values(defaults);
}

/**
 * `host:porta/base` sem usuário, senha ou query string — seguro para exibir
 * em telas de diagnóstico.
 */
export function redactDatabaseUrl(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    const database = parsed.pathname.replace(/^\//, "");
    return `${parsed.hostname}:${parsed.port || "5432"}${
      database ? `/${database}` : ""
    }`;
  } catch {
    return "url inválida";
  }
}

export async function createDatabase(options?: {
  databaseUrl?: string;
  dataDir?: string;
  autoMigrate?: boolean;
}): Promise<{
  db: AppDb;
  close: () => Promise<void>;
  driver: "pglite" | "postgres";
  info: DbRuntimeInfo;
}> {
  const databaseUrl = options?.databaseUrl ?? process.env.DATABASE_URL;

  // Em serverless (Vercel) o disco é somente leitura e cada instância é
  // efêmera: o PGlite local não serve. Falha cedo com mensagem clara.
  if (!databaseUrl && process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL não configurada. Na Vercel, use um PostgreSQL gerenciado (ex.: Neon) nas variáveis de ambiente.",
    );
  }

  const dataDir =
    options?.dataDir ?? process.env.PGLITE_DIR ?? ".data/pglite";
  const migrate = options?.autoMigrate ?? shouldAutoMigrate(Boolean(databaseUrl));

  if (databaseUrl) {
    const client = postgres(databaseUrl, {
      max: 5,
      prepare: false,
      idle_timeout: 20,
    });
    const db = drizzlePostgres(client, { schema }) as unknown as AppDb;
    if (migrate) {
      await migratePostgres(db as never, { migrationsFolder: MIGRATIONS_FOLDER });
    }
    await ensureDefaults(db);
    const info: DbRuntimeInfo = {
      driver: "postgres",
      target: redactDatabaseUrl(databaseUrl),
      startedAt: new Date(),
      autoMigrate: migrate,
    };
    return {
      db,
      driver: "postgres",
      info,
      close: async () => {
        await client.end({ timeout: 5 });
      },
    };
  }

  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  await client.waitReady;
  const db = drizzlePglite(client, { schema });
  if (migrate) {
    await migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER });
  }
  await ensureDefaults(db);

  const info: DbRuntimeInfo = {
    driver: "pglite",
    // Caminho relativo de propósito: resolver com `process.cwd()` faria o
    // Turbopack rastrear o projeto inteiro para o bundle de produção.
    target: dataDir,
    startedAt: new Date(),
    autoMigrate: migrate,
  };

  return {
    db,
    driver: "pglite",
    info,
    close: async () => {
      await client.close();
    },
  };
}

async function initDb() {
  const created = await createDatabase();
  globalForDb.__studioAuroraClient = { close: created.close };
  globalForDb.__studioAuroraInfo = created.info;
  return created.db;
}

/** Instância única por processo (sobrevive ao hot reload do Next em dev). */
export async function getDb(): Promise<AppDb> {
  if (!globalForDb.__studioAuroraDb) {
    globalForDb.__studioAuroraDb = initDb().catch((error) => {
      globalForDb.__studioAuroraDb = undefined;
      throw error;
    });
  }
  return globalForDb.__studioAuroraDb;
}

/**
 * Metadados do banco em uso no processo. Retorna `null` enquanto o banco ainda
 * não foi inicializado (nenhuma consulta executada).
 */
export async function getDbInfo(): Promise<DbRuntimeInfo | null> {
  if (!globalForDb.__studioAuroraDb) {
    await getDb();
  }
  return globalForDb.__studioAuroraInfo ?? null;
}

export { schema };
