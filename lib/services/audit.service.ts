import { prisma } from "@/lib/db";
import type { ListQuery } from "@/lib/http/pagination";

export interface AuditFilters {
  action?: string;
  resource?: string;
  actorId?: string;
}

export async function listAuditLogs(query: ListQuery, filters: AuditFilters) {
  const where = {
    ...(filters.action ? { action: { contains: filters.action } } : {}),
    ...(filters.resource ? { resource: filters.resource } : {}),
    ...(filters.actorId ? { actorId: filters.actorId } : {}),
    ...(query.q
      ? {
          OR: [
            { action: { contains: query.q } },
            { resource: { contains: query.q } },
            { resourceId: { contains: query.q } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        resource: true,
        resourceId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, email: true, role: true } },
      },
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map((log) => ({
      ...log,
      // metadata is stored as JSON text; parse defensively for the UI.
      metadata: (() => {
        if (!log.metadata) return null;
        try {
          return JSON.parse(log.metadata) as Record<string, unknown>;
        } catch {
          return { raw: log.metadata };
        }
      })(),
    })),
    total,
  };
}

/** Distinct resource names, used to populate the audit log filter. */
export async function listAuditResources(): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({ distinct: ["resource"], select: { resource: true } });
  return rows.map((r) => r.resource).sort();
}
