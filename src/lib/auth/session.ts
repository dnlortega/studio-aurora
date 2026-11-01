import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { eq, lt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { sessions, users, type User } from "@/lib/db/schema";

const COOKIE_NAME = "aurora_sessao";
const SESSION_DAYS = 30;

function hashToken(token: string): string {
  const secret = process.env.AUTH_SECRET;
  const digest = secret
    ? createHmac("sha256", secret).update(token).digest("hex")
    : createHash("sha256").update(token).digest("hex");
  return digest;
}

function cookieOptions(expires: Date) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function createSession(userId: string): Promise<void> {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  // Higiene: remove sessões vencidas antes de criar outra.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
  });

  const store = await cookies();
  store.set({ ...cookieOptions(expiresAt), value: token });
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }
  store.set({ ...cookieOptions(new Date(0)), value: "" });
}

export type SessionUser = User;

/**
 * Usuário da sessão atual. Sempre consultado no banco — nunca confiamos apenas
 * no cookie. `cache` evita consultas repetidas durante a mesma renderização.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const db = await getDb();
  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, hashToken(token)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (row.expiresAt.getTime() <= Date.now() || !row.user.isActive) {
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
    return null;
  }

  return row.user;
});

/** Revoga todas as sessões de um usuário (ex.: após trocar a senha). */
export async function revokeAllSessions(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Só expõe dados seguros para o cliente. */
export function toPublicUser(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    notifyEmail: user.notifyEmail,
    notifyWhatsapp: user.notifyWhatsapp,
  };
}

export { COOKIE_NAME, hashToken };
