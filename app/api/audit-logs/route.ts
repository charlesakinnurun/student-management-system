import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole } from "@/lib/auth/session";
import { listAuditLogs } from "@/lib/services/audit.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["createdAt", "action", "resource"],
      defaultSort: "createdAt",
    });
    const params = req.nextUrl.searchParams;
    const { items, total } = await listAuditLogs(query, {
      action: params.get("action") ?? undefined,
      resource: params.get("resource") ?? undefined,
      actorId: params.get("actorId") ?? undefined,
    });
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}
