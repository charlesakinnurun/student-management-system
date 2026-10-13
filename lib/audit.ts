import { prisma } from "@/lib/db";

export interface AuditEvent {
  actorId?: string | null;
  /** Dot-namespaced action, e.g. `student.create`, `grade.change`, `auth.login`. */
  action: string;
  /** Resource type, e.g. `StudentProfile`, `Score`. */
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Append an audit record.
 *
 * Auditing must never break the primary operation: failures are logged and
 * swallowed. `metadata` is serialised to JSON (the column is TEXT for
 * SQLite/Postgres portability).
 */
export async function recordAudit(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: event.actorId ?? null,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId ?? null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record event", { action: event.action, error });
  }
}
