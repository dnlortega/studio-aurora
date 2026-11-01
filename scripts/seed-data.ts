import { eq, sql } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/password";
import type { AppDb } from "@/lib/db";
import { services, users } from "@/lib/db/schema";

/**
 * Catálogo inicial do Studio Aurora.
 * Estes serviços são conteúdo real de demonstração do salão — podem ser
 * editados/desativados pelo painel administrativo a qualquer momento.
 */
export const CATALOG = [
  {
    name: "Corte autoral",
    slug: "corte-autoral",
    description:
      "Corte desenhado para o seu rosto e rotina, com consultoria de estilo e finalização.",
    priceCents: 14000,
    durationMin: 60,
    sortOrder: 1,
  },
  {
    name: "Escova & finalização",
    slug: "escova-finalizacao",
    description:
      "Escova modelada com produtos que respeitam a fibra capilar e prolongam o resultado.",
    priceCents: 9000,
    durationMin: 45,
    sortOrder: 2,
  },
  {
    name: "Coloração & iluminado",
    slug: "coloracao-iluminado",
    description:
      "Cor personalizada, iluminado e correção de tom com diagnóstico capilar antes do processo.",
    priceCents: 32000,
    durationMin: 150,
    sortOrder: 3,
  },
  {
    name: "Hidratação profunda",
    slug: "hidratacao-profunda",
    description:
      "Tratamento intensivo de reconstrução e brilho, indicado para cabelos castigados.",
    priceCents: 11000,
    durationMin: 40,
    sortOrder: 4,
  },
  {
    name: "Manicure & esmaltação",
    slug: "manicure-esmaltacao",
    description:
      "Cuidado completo para as mãos, com cutilagem delicada e esmaltação de longa duração.",
    priceCents: 5500,
    durationMin: 40,
    sortOrder: 5,
  },
  {
    name: "Design de sobrancelhas",
    slug: "design-sobrancelhas",
    description:
      "Mapeamento facial e design personalizado, com opção de henna e pinça.",
    priceCents: 6500,
    durationMin: 30,
    sortOrder: 6,
  },
  {
    name: "Maquiagem social",
    slug: "maquiagem-social",
    description:
      "Make de longa duração para eventos, com pele preparada e produtos profissionais.",
    priceCents: 18000,
    durationMin: 60,
    sortOrder: 7,
  },
  {
    name: "Penteado & ocasiões",
    slug: "penteado-ocasioes",
    description:
      "Penteados para casamentos, formaturas e festas, com teste prévio opcional.",
    priceCents: 16000,
    durationMin: 60,
    sortOrder: 8,
  },
] as const;

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
