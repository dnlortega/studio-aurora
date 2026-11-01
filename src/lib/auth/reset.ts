import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { passwordResetTokens } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/session";

const TOKEN_TTL_MS = 60 * 60 * 1000;

export async function issuePasswordResetToken(userId: string) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  // Um link ativo por vez.
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));
  await db.insert(passwordResetTokens).values({
    id: hashToken(token),
    userId,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function findPasswordResetToken(token: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.id, hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function markPasswordResetTokenUsed(id: string) {
  const db = await getDb();
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, id));
}
