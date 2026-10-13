import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole } from "@/lib/auth/session";
import { createFacultySchema } from "@/lib/validation/academic";
import { createFaculty, listFaculties } from "@/lib/services/academic.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN", "LECTURER");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["name", "code", "createdAt"],
      defaultSort: "name",
      defaultOrder: "asc",
    });
    const { items, total } = await listFaculties(query);
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, createFacultySchema);
    return created(await createFaculty(input, session.userId));
  });
}
