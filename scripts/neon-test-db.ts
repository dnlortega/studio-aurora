import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "@/lib/db/schema";

export { describeDatabaseTarget, loadEnvFile } from "./load-env";

/**
 * Bancos de teste no mesmo projeto Neon da aplicação.
 *
 * Nada aqui usa banco local. Os testes de integração (Vitest) e os ponta a
 * ponta (Playwright) usam bancos próprios na Neon, separados do banco do
 * salão, cada um com seu schema `public` e seu journal de migrações:
 *
 * - `aurora_test` — Vitest (zerado e re-migrado a cada arquivo de teste);
 * - `aurora_e2e`  — Playwright (zerado e re-migrado antes da suíte).
 *
 * A separação é o que permite apagar tabelas sem medo: o `DROP OWNED BY` roda
 * dentro de um banco que só tem dados de teste. A guard abaixo é a trava — o
 * nome do banco precisa ser exatamente um destes dois; qualquer outro alvo é
 * recusado antes de abrir conexão.
 */

export type TestDatabaseKind = "unit" | "e2e";

export const TEST_DATABASES: Record<TestDatabaseKind, string> = {
  unit: "aurora_test",
  e2e: "aurora_e2e",
};

const URL_ENV_OVERRIDE: Record<TestDatabaseKind, string> = {
  unit: "TEST_DATABASE_URL",
  e2e: "E2E_DATABASE_URL",
};

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

export function databaseNameOf(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

export function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

/**
 * URL do banco de teste. Aceita override (`TEST_DATABASE_URL` /
 * `E2E_DATABASE_URL`) e, sem ele, deriva do `DATABASE_URL` do aplicativo
 * trocando apenas o nome do banco — mesmo host, mesmo usuário, dados isolados.
 */
export function resolveTestDatabaseUrl(kind: TestDatabaseKind): string {
  const override = process.env[URL_ENV_OVERRIDE[kind]]?.trim();
  const fromApp = process.env.DATABASE_URL?.trim();
  const url =
    override || (fromApp ? withDatabase(fromApp, TEST_DATABASES[kind]) : "");

  if (!url) {
    throw new Error(
      `Sem banco de teste (${kind}): defina ${URL_ENV_OVERRIDE[kind]} ou DATABASE_URL apontando para o PostgreSQL da Neon.`,
    );
  }
  if (databaseNameOf(url) !== TEST_DATABASES[kind]) {
    throw new Error(
      `A URL de teste (${kind}) precisa usar o banco "${TEST_DATABASES[kind]}"; recebida: "${
        databaseNameOf(url) || "inválida"
      }". Recusando apagar dados de outro banco.`,
    );
  }
  return url;
}

/**
 * Conexão de manutenção (`postgres`) no mesmo servidor: é de lá que se cria o
 * banco de teste, porque não dá para conectar a um banco que ainda não existe.
 */
function bootstrapUrl(testUrl: string): string {
  return withDatabase(testUrl, "postgres");
}

/** Cria o banco de teste no projeto Neon, se ainda não existir. */
export async function ensureTestDatabase(kind: TestDatabaseKind): Promise<void> {
  const target = TEST_DATABASES[kind];
  const testUrl = resolveTestDatabaseUrl(kind);

  if (await databaseExists(testUrl, target)) return;

  const admin = postgres(bootstrapUrl(testUrl), { max: 1, prepare: false });
  try {
    await admin.unsafe(`CREATE DATABASE "${target}"`);
  } finally {
    await admin.end({ timeout: 5 });
  }

  if (!(await databaseExists(testUrl, target))) {
    throw new Error(
      `Falha ao criar o banco de teste "${target}" na Neon (CREATE DATABASE não foi aceito).`,
    );
  }
}

async function databaseExists(url: string, target: string): Promise<boolean> {
  const client = postgres(url, { max: 1, prepare: false });
  try {
    const rows = await client.unsafe(
      "select 1 from pg_database where datname = $1",
      [target],
    );
    return rows.length > 0;
  } catch (error) {
    const message = String(error);
    if (/does not exist|database .* does not exist/i.test(message)) return false;
    throw new Error(
      `O banco de teste "${target}" não está acessível na Neon: ${message.slice(0, 200)}`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

/**
 * Zera o banco de teste e reaplica as migrações reais.
 *
 * `DROP OWNED BY current_user CASCADE` remove tudo que o papel do projeto criou
 * naquele banco (tabelas, tipos, schemas de apoio e o journal do Drizzle) sem
 * depender de permissão para recriar o schema `public`.
 */
export async function resetTestDatabase(
  kind: TestDatabaseKind,
): Promise<string> {
  await ensureTestDatabase(kind);
  const url = resolveTestDatabaseUrl(kind);

  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    await client.unsafe("DROP OWNED BY current_user CASCADE");
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await client.end({ timeout: 5 });
  }
  return url;
}
