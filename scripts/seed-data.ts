import { eq, sql } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/password";
import type { AppDb } from "@/lib/db";
import { services, users } from "@/lib/db/schema";

/**
 * Catálogo do Studio Aurora — só unhas.
 *
 * O salão trabalha com manicure, pedicure e alongamento em gel; não há
 * serviços de cabelo ou maquiagem. Estes registros são conteúdo real de
 * demonstração e podem ser editados, desativados ou ampliados pelo painel
 * administrativo a qualquer momento.
 */
export const CATALOG = [
  {
    name: "Manicure & esmaltação",
    slug: "manicure-esmaltacao",
    description:
      "Cutilagem, lixamento e esmaltação completa das unhas das mãos.",
    priceCents: 5500,
    durationMin: 40,
    sortOrder: 1,
  },
  {
    name: "Pedicure & esmaltação",
    slug: "pedicure-esmaltacao",
    description:
      "Cuidado completo para os pés, com cutilagem, lixamento e esmaltação.",
    priceCents: 7000,
    durationMin: 50,
    sortOrder: 2,
  },
  {
    name: "Unhas em gel",
    slug: "unhas-em-gel",
    description:
      "Modelagem e banheira de gel com acabamento de longa duração.",
    priceCents: 12000,
    durationMin: 80,
    sortOrder: 3,
  },
] as const;

/**
 * Textos públicos do salão aplicados pelo seed e pelo `db:sync-catalog`.
 * Só substituem um valor atual quando ele ainda for o texto antigo padrão —
 * edição feita no painel nunca é sobrescrita.
 */
export const STUDIO_PROFILE = {
  salonName: "Studio Aurora",
  tagline: "Unhas cuidadas no seu tempo.",
  description:
    "Estúdio de manicure em São Paulo. Manicure, pedicure e unhas em gel com material esterilizado, agenda organizada e atendimento individual.",
  address: "Rua Harmonia, 402 — Vila Madalena, São Paulo/SP",
  phone: "(11) 3030-1414",
  whatsapp: "5511930301414",
  email: "contato@studioaurora.com.br",
  instagram: "@studioaurora",
  publicNotice:
    "Atendimento por hora marcada. Chegue com 10 minutos de antecedência para aproveitar o café da casa.",
} as const;

/**
 * Substituições antigas (salão de beleza) que ainda podem estar gravadas no
 * banco: enquanto o valor for um destes textos, ele é considerado padrão e o
 * `db:sync-catalog` pode atualizá-lo.
 */
export const LEGACY_PROFILE_VALUES: readonly string[] = [
  "Beleza que respeita o seu tempo.",
  "Studio de beleza autoral em São Paulo. Cortes, cor, cuidados e ocasiões especiais com agenda organizada e atendimento individual.",
  "Acreditamos que beleza é presença. Por isso, cada atendimento é reservado com tempo de sobra: para ouvir você, entender o seu dia a dia e criar algo que faça sentido na sua rotina.",
];

/** Marca os agendamentos criados pelo seed — é o que autoriza a limpeza deles. */
export const DEMO_NOTES = "Agendamento de demonstração criado pelo seed.";

export async function seedCatalog(db: AppDb): Promise<number> {
  let created = 0;
  for (const item of CATALOG) {
    const existing = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.slug, item.slug))
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(services).values({ ...item, isActive: true });
    created += 1;
  }
  return created;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Cria (ou promove) um usuário. Usado apenas por scripts locais de seed e
 * bootstrap — nunca por rotas públicas da aplicação.
 */
export async function ensureUser(
  db: AppDb,
  input: {
    name: string;
    email: string;
    password: string;
    role: "client" | "admin";
    phone?: string | null;
    updatePassword?: boolean;
  },
): Promise<{ id: string; created: boolean; updated: boolean }> {
  const email = normalizeEmail(input.email);
  const existing = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (existing[0]) {
    if (input.updatePassword) {
      await db
        .update(users)
        .set({
          name: input.name,
          email,
          phone: input.phone ?? null,
          passwordHash: await hashPassword(input.password),
          role: input.role,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id));
      return { id: existing[0].id, created: false, updated: true };
    }
    return { id: existing[0].id, created: false, updated: false };
  }

  const [created] = await db
    .insert(users)
    .values({
      name: input.name,
      email,
      phone: input.phone ?? null,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      isActive: true,
    })
    .returning({ id: users.id });

  return { id: created.id, created: true, updated: false };
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Variável ${name} é obrigatória.`);
    process.exit(1);
  }
  return value;
}
