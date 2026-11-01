import { eq } from "drizzle-orm";

import { getDb, type AppDb } from "@/lib/db";
import { settings, type Settings } from "@/lib/db/schema";

export async function getSettings(db?: AppDb): Promise<Settings> {
  const database = db ?? (await getDb());

  const existing = await database
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);

  if (existing[0]) return existing[0];

  const inserted = await database
    .insert(settings)
    .values({ id: 1 })
    .onConflictDoNothing({ target: settings.id })
    .returning();

  if (inserted[0]) return inserted[0];

  const rows = await database
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);

  return rows[0];
}
