import path from "node:path";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "./schema";

export type AppDb = PostgresJsDatabase<typeof schema>;

/**
 * Descrição pública do banco em uso, sem credenciais. Usada pelo painel de
 * status (`/admin/status`) e por diagnósticos.
 */
export type DbRuntimeInfo = {
  driver: "postgres";
  /**
   * `host:porta/base` de `DATABASE_URL` — usuário e senha são removidos antes
   * de qualquer exibição.
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

function shouldAutoMigrate() {
  const flag = process.env.DB_AUTO_MIGRATE;
  if (flag === "true") return true;
  // O padrão é não migrar no boot: em produção quem aplica migração é o
  // `npm run db:migrate`, e duas functions serverless migrando ao mesmo tempo
  // corrompe o journal do Drizzle.
  return false;
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

/**
 * Abre uma conexão com o PostgreSQL da Neon.
 *
 * Não existe banco local: `DATABASE_URL` é obrigatória em desenvolvimento,
 * teste e produção. Assim o que aparece na tela é sempre o mesmo conjunto de
 * dados, e nenhum teste precisa de um Postgres embutido na máquina de quem
 * programa.
 */
export async function createDatabase(options?: {
  databaseUrl?: string;
  autoMigrate?: boolean;
}): Promise<{
  db: AppDb;
  close: () => Promise<void>;
  driver: "postgres";
  info: DbRuntimeInfo;
}> {
  const databaseUrl =
    options?.databaseUrl?.trim() || process.env.DATABASE_URL?.trim() || "";

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL não configurada. O Studio Aurora usa exclusivamente o PostgreSQL da Neon — copie o valor de .env.local (ou defina a variável) e rode novamente.",
    );
  }

  const migrateOnBoot = options?.autoMigrate ?? shouldAutoMigrate();

  const client = postgres(databaseUrl, {
    max: 5,
    prepare: false,
    idle_timeout: 20,
    // Os NOTICE do Postgres (`relation ... already exists, skipping`) são
    // esperados durante migração idempotente; imprimi-los faria todo seed
    // parecer que algo deu errado.
    onnotice: () => {},
  });
  const db = drizzle(client, { schema });
  if (migrateOnBoot) {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  }
  await ensureDefaults(db);

  const info: DbRuntimeInfo = {
    driver: "postgres",
    target: redactDatabaseUrl(databaseUrl),
    startedAt: new Date(),
    autoMigrate: migrateOnBoot,
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
