import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole } from "@/lib/auth/session";
import { createSessionSchema } from "@/lib/validation/session";
import { createAcademicSession, listAcademicSessions } from "@/lib/services/session.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN", "LECTURER");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["name", "startDate", "createdAt"],
      defaultSort: "name",
      defaultOrder: "desc",
    });
    const { items, total } = await listAcademicSessions(query);
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, createSessionSchema);
    return created(await createAcademicSession(input, session.userId));
  });
}
