import type { AppDb } from "@/lib/db";
import { adminAuditLogs } from "@/lib/db/schema";

export async function logAdminAction(
  db: AppDb,
  input: {
    actorId: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: string;
  },
): Promise<void> {
  await db.insert(adminAuditLogs).values({
    actorId: input.actorId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    details: input.details,
  });
}
