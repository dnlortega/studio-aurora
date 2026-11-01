import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { count, sql } from "drizzle-orm";

import { getDb, getDbInfo, redactDatabaseUrl } from "@/lib/db";
import { appointments, services, users } from "@/lib/db/schema";

/**
 * Diagnóstico da instalação: banco, hospedagem (Vercel), repositório (GitHub)
 * e integrações.
 *
 * Nunca inclui valores de segredos — chaves e senhas aparecem apenas como
 * "configurado / ausente". A URL do banco é reduzida a host:porta/base.
 */

export type StatusTone = "ok" | "warn" | "error" | "neutral";

export type StatusItem = {
  label: string;
  value: string;
  tone: StatusTone;
  detail?: string;
};

export type StatusSection = {
  id: "banco" | "hospedagem" | "repositorio" | "integracoes";
  title: string;
  description: string;
  items: StatusItem[];
};

export type SystemStatus = {
  generatedAt: Date;
  overall: StatusTone;
  sections: StatusSection[];
};

/** Input do builder — separado para permitir teste unitário sem I/O. */
export type StatusInput = {
  now: Date;
  nodeEnv: string;
  uptimeSeconds: number;
  nodeVersion: string;
  appVersion: string;
  nextVersion: string;
  database:
    | {
        connected: boolean;
        latencyMs: number | null;
        driver: "postgres" | null;
        target: string | null;
        autoMigrate: boolean | null;
        migrationsApplied: number | null;
        tables: { users: number; services: number; appointments: number };
        error?: string;
      }
    | null;
  vercel: {
    isVercel: boolean;
    env: string | null;
    region: string | null;
    publicUrl: string | null;
  };
  repository: {
    source: "vercel" | "git" | "nenhum";
    provider: string | null;
    repo: string | null;
    branch: string | null;
    commit: string | null;
    url: string | null;
  };
  secrets: {
    authSecret: boolean;
    resendApiKey: boolean;
    emailFrom: boolean;
    databaseUrl: boolean;
  };
};

const VERCEL_REGIONS: Record<string, string> = {
  "iad1": "Washington D.C. (EUA)",
  "sfo1": "São Francisco (EUA)",
  "sfo2": "São Francisco (EUA)",
  "lax1": "Los Angeles (EUA)",
  "cle1": "Cleveland (EUA)",
  "dfw1": "Dallas (EUA)",
  "pdx1": "Portland (EUA)",
  "sin1": "Singapore",
  "hnd1": "Tóquio (Japão)",
  "cdg1": "Paris (França)",
  "lhr1": "Londres (Reino Unido)",
  "fra1": "Frankfurt (Alemanha)",
};

function driverLabel(driver: "postgres", target: string | null) {
  if (target?.includes("neon.tech")) return "PostgreSQL gerenciado (Neon)";
  if (target?.includes("supabase")) return "PostgreSQL (Supabase)";
  return "PostgreSQL externo";
}

/**
 * O Drizzle registra as migrações aplicadas em `drizzle.__drizzle_migrations`
 * (schema próprio desde o Drizzle 0.4x). Aceitamos também a tabela em `public`
 * para instalações mais antigas e devolvemos `null` quando nenhuma existe.
 */
async function countAppliedMigrations(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<number | null> {
  for (const qualified of [
    sql`"drizzle"."__drizzle_migrations"`,
    sql`"public"."__drizzle_migrations"`,
  ]) {
    try {
      const result = await db.execute(
        sql`select count(*)::int as total from ${qualified}`,
      );
      const row = (Array.isArray(result) ? result[0] : result) as
        | { total?: number }
        | undefined;
      if (typeof row?.total === "number") return row.total;
    } catch {
      // tabela inexistente neste schema: tenta o próximo
    }
  }
  return null;
}

/**
 * Remove credenciais de uma mensagem de erro antes de ela aparecer em tela.
 * Drivers de banco costumam ecoar a string de conexão inteira no texto do erro,
 * e o painel de status é lido por mais de uma pessoa.
 */
export function sanitizeDiagnosticError(message: string): string {
  let output = message;
  for (const secret of [
    process.env.DATABASE_URL,
    process.env.AUTH_SECRET,
    process.env.RESEND_API_KEY,
  ]) {
    if (secret && secret.length >= 6) output = output.split(secret).join("[redigido]");
  }
  output = output.replace(/\/\/[^/\s@]+:[^@\s]+@/g, "//[redigido]@");
  return output.slice(0, 200);
}

export function buildStatusSections(input: StatusInput): StatusSection[] {
  const banco: StatusItem[] = [];

  if (!input.database || !input.database.connected) {
    banco.push({
      label: "Conexão",
      value: "falhou",
      tone: "error",
      detail: input.database?.error ?? "o banco ainda não respondeu",
    });
  } else {
    const { driver, target } = input.database;
    banco.push({
      label: "Conexão",
      value: `ok em ${input.database.latencyMs ?? 0} ms`,
      tone: "ok",
    });
    banco.push({
      label: "Motor",
      value: driver ? driverLabel(driver, target) : "desconhecido",
      tone: driver ? "ok" : "warn",
      detail: target ?? undefined,
    });
    banco.push({
      label: "Destino",
      value: target ?? "—",
      tone: "neutral",
      detail: "usuário e senha não são exibidos",
    });
    banco.push({
      label: "Migrações",
      value:
        input.database.migrationsApplied === null
          ? "tabela de controle não encontrada"
          : `${input.database.migrationsApplied} aplicada(s)`,
      tone:
        input.database.migrationsApplied && input.database.migrationsApplied > 0
          ? "ok"
          : "warn",
      detail: input.database.autoMigrate
        ? "auto-migração ativa (DB_AUTO_MIGRATE)"
        : "auto-migração desligada — rode npm run db:migrate ao publicar",
    });
    banco.push({
      label: "Registros",
      value: `${input.database.tables.users} conta(s), ${input.database.tables.services} serviço(s), ${input.database.tables.appointments} agendamento(s)`,
      tone: "neutral",
    });
  }

  const hospedagem: StatusItem[] = [
    input.vercel.isVercel
      ? {
          label: "Execução",
          value: `Vercel (${input.vercel.env ?? "desconhecido"})`,
          tone: "ok",
        }
      : {
          label: "Execução",
          value:
            input.nodeEnv === "production"
              ? "servidor próprio em produção"
              : "ambiente local (npm run dev)",
          tone: input.nodeEnv === "production" ? "ok" : "neutral",
        },
    {
      label: "Node",
      value: `${input.nodeVersion} · uptime ${Math.round(input.uptimeSeconds)}s`,
      tone: "neutral",
    },
    {
      label: "Aplicação",
      value: `Studio Aurora ${input.appVersion} · Next.js ${input.nextVersion}`,
      tone: "neutral",
    },
    {
      label: "URL pública",
      value: input.vercel.publicUrl ?? "não configurada",
      tone: input.vercel.publicUrl ? "ok" : "warn",
      detail: "usada nos links de recuperação de senha (NEXT_PUBLIC_APP_URL)",
    },
  ];
  if (input.vercel.region) {
    hospedagem.push({
      label: "Região",
      value: `${input.vercel.region} — ${
        VERCEL_REGIONS[input.vercel.region] ?? "região não mapeada"
      }`,
      tone: "neutral",
    });
  }

  const repositorio: StatusItem[] = [];
  if (input.repository.source === "nenhum") {
    repositorio.push({
      label: "Origem do código",
      value: "não identificada",
      tone: "warn",
      detail:
        "defina NEXT_PUBLIC_REPOSITORY_URL ou publique o repositório para o commit aparecer aqui",
    });
  } else {
    repositorio.push({
      label: "Provedor",
      value: input.repository.provider ?? "github",
      tone: "neutral",
      detail:
        input.repository.source === "vercel"
          ? "informações vindas das variáveis da Vercel"
          : "informações vindas do git local",
    });
    repositorio.push({
      label: "Repositório",
      value: input.repository.repo ?? "não informado",
      tone: input.repository.repo ? "ok" : "warn",
    });
    repositorio.push({
      label: "Branch",
      value: input.repository.branch ?? "não informado",
      tone: "neutral",
    });
    repositorio.push({
      label: "Commit",
      value: input.repository.commit ?? "não informado",
      tone: input.repository.commit ? "ok" : "warn",
    });
    if (input.repository.url) {
      repositorio.push({
        label: "Endereço",
        value: input.repository.url,
        tone: "neutral",
      });
    }
  }

  const integracoes: StatusItem[] = [
    {
      label: "AUTH_SECRET",
      value: input.secrets.authSecret ? "configurado" : "ausente",
      tone: input.secrets.authSecret ? "ok" : "error",
      detail: "necessário para assinar as sessões; o valor nunca é exibido",
    },
    {
      label: "DATABASE_URL",
      value: input.secrets.databaseUrl ? "configurada" : "ausente",
      tone: input.secrets.databaseUrl ? "ok" : "warn",
      detail: input.secrets.databaseUrl
        ? "o app usa o PostgreSQL externo"
        : "sem DATABASE_URL o app cai no banco embutido (só desenvolvimento)",
    },
    {
      label: "E-mail (Resend)",
      value: input.secrets.resendApiKey ? "configurado" : "não configurado",
      tone: input.secrets.resendApiKey ? "ok" : "warn",
      detail: input.secrets.resendApiKey
        ? `remetente ${input.secrets.emailFrom ? "definido" : "ausente (EMAIL_FROM)"}`
        : "nenhum e-mail é enviado; as notificações ficam registradas como não configuradas",
    },
    {
      label: "WhatsApp",
      value: "não integrado",
      tone: "warn",
      detail:
        "o módulo registra a tentativa como não configurada; nenhuma mensagem é enviada nem simulada",
    },
  ];

  return [
    {
      id: "banco",
      title: "Banco de dados",
      description: "Estado da conexão e do schema aplicado.",
      items: banco,
    },
    {
      id: "hospedagem",
      title: "Servidor",
      description: "Onde esta instância está rodando.",
      items: hospedagem,
    },
    {
      id: "repositorio",
      title: "Repositório",
      description: "Versão do código publicada.",
      items: repositorio,
    },
    {
      id: "integracoes",
      title: "Integrações e chaves",
      description: "Somente presença das chaves — nunca os valores.",
      items: integracoes,
    },
  ];
}

function readPackageVersions() {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    const parsed = JSON.parse(raw) as {
      version?: string;
      dependencies?: Record<string, string>;
    };
    return {
      appVersion: parsed.version ?? "0.0.0",
      nextVersion: parsed.dependencies?.next ?? "desconhecida",
    };
  } catch {
    return { appVersion: "desconhecida", nextVersion: "desconhecida" };
  }
}

function readGitRepository(): StatusInput["repository"] {
  const run = (command: string) => {
    try {
      return execSync(command, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 1500,
      }).trim();
    } catch {
      return "";
    }
  };
  const branch = run("git rev-parse --abbrev-ref HEAD");
  const commit = run("git rev-parse --short HEAD");
  const remoteUrl = run("git config --get remote.origin.url");
  if (!branch && !commit && !remoteUrl) return { source: "nenhum", provider: null, repo: null, branch: null, commit: null, url: null };
  const configured = process.env.NEXT_PUBLIC_REPOSITORY_URL ?? null;
  const slug = remoteUrl
    .replace(/\.git$/, "")
    .replace(/^.*github[:/]/, "")
    .replace(/^https?:\/\/github\.com\//, "");
  return {
    source: "git",
    provider: "github",
    repo: slug || null,
    branch: branch || null,
    commit: commit || null,
    url: configured ?? (remoteUrl ? remoteUrl.replace(/\.git$/, "") : null),
  };
}

function readVercelRepository(): StatusInput["repository"] {
  const slug = process.env.VERCEL_GIT_REPO_SLUG ?? null;
  const owner = process.env.VERCEL_GIT_REPO_OWNER ?? null;
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
  return {
    source: "vercel",
    provider: process.env.VERCEL_GIT_PROVIDER ?? "github",
    repo: slug ? (owner ? `${owner}/${slug}` : slug) : null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    commit: sha ? sha.slice(0, 7) : null,
    url: process.env.NEXT_PUBLIC_REPOSITORY_URL ?? null,
  };
}

export async function getSystemStatus(): Promise<SystemStatus> {
  let database: StatusInput["database"] = null;
  try {
    const db = await getDb();
    const info = await getDbInfo();
    const startedAt = Date.now();
    await db.execute(sql`select 1`);
    const latencyMs = Date.now() - startedAt;

    const [usersRow, servicesRow, appointmentsRow] = await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(services),
      db.select({ value: count() }).from(appointments),
    ]);

    let migrationsApplied: number | null = null;
    try {
      migrationsApplied = await countAppliedMigrations(db);
    } catch {
      migrationsApplied = null;
    }

    // O app só fala com PostgreSQL externo; sem os metadados do processo o
    // destino sai da própria variável de ambiente.
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const inferredTarget = databaseUrl ? redactDatabaseUrl(databaseUrl) : null;

    database = {
      connected: true,
      latencyMs,
      driver: info?.driver ?? (databaseUrl ? "postgres" : null),
      target: info?.target ?? inferredTarget,
      autoMigrate: info?.autoMigrate ?? null,
      migrationsApplied,
      tables: {
        users: usersRow[0]?.value ?? 0,
        services: servicesRow[0]?.value ?? 0,
        appointments: appointmentsRow[0]?.value ?? 0,
      },
    };
  } catch (error) {
    database = {
      connected: false,
      latencyMs: null,
      driver: null,
      target: process.env.DATABASE_URL
        ? redactDatabaseUrl(process.env.DATABASE_URL)
        : null,
      autoMigrate: null,
      migrationsApplied: null,
      tables: { users: 0, services: 0, appointments: 0 },
      error: sanitizeDiagnosticError(
        error instanceof Error ? error.message : "erro desconhecido",
      ),
    };
  }

  const versions = readPackageVersions();
  const repository = process.env.VERCEL
    ? readVercelRepository()
    : readGitRepository();

  const input: StatusInput = {
    now: new Date(),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    uptimeSeconds: process.uptime(),
    nodeVersion: process.version,
    appVersion: versions.appVersion,
    nextVersion: versions.nextVersion,
    database,
    vercel: {
      isVercel: Boolean(process.env.VERCEL),
      env: process.env.VERCEL_ENV ?? null,
      region: process.env.VERCEL_REGION ?? null,
      publicUrl:
        process.env.NEXT_PUBLIC_APP_URL ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null),
    },
    repository,
    secrets: {
      authSecret: Boolean(process.env.AUTH_SECRET),
      resendApiKey: Boolean(process.env.RESEND_API_KEY),
      emailFrom: Boolean(process.env.EMAIL_FROM),
      databaseUrl: Boolean(process.env.DATABASE_URL),
    },
  };

  const sections = buildStatusSections(input);
  const tones = sections.flatMap((section) => section.items.map((item) => item.tone));
  const overall: StatusTone = tones.includes("error")
    ? "error"
    : tones.includes("warn")
      ? "warn"
      : "ok";

  return { generatedAt: input.now, overall, sections };
}
