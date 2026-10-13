import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole } from "@/lib/auth/session";
import { createSemesterSchema } from "@/lib/validation/session";
import { createSemester, listSemesters } from "@/lib/services/session.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN", "LECTURER");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["startDate", "name", "createdAt"],
      defaultSort: "startDate",
      defaultOrder: "asc",
    });
    const { items, total } = await listSemesters(
      query,
      req.nextUrl.searchParams.get("sessionId") ?? undefined,
    );
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, createSemesterSchema);
    return created(await createSemester(input, session.userId));
  });
}
