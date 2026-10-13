import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole } from "@/lib/auth/session";
import { createStaffSchema } from "@/lib/validation/staff";
import { createStaff, listStaff } from "@/lib/services/staff.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN", "LECTURER");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["createdAt", "lastName", "firstName", "staffId"],
      defaultSort: "createdAt",
    });
    const params = req.nextUrl.searchParams;
    const { items, total } = await listStaff(query, {
      departmentId: params.get("departmentId") ?? undefined,
      role: params.get("role") ?? undefined,
    });
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, createStaffSchema);
    return created(await createStaff(input, session.userId));
  });
}
