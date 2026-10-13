import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole } from "@/lib/auth/session";
import { createStudentSchema } from "@/lib/validation/student";
import { createStudent, listStudents } from "@/lib/services/student.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN", "LECTURER");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["createdAt", "lastName", "firstName", "studentId", "level"],
      defaultSort: "createdAt",
    });
    const params = req.nextUrl.searchParams;
    const { items, total } = await listStudents(query, {
      departmentId: params.get("departmentId") ?? undefined,
      facultyId: params.get("facultyId") ?? undefined,
      level: params.get("level") ?? undefined,
      status: params.get("status") ?? undefined,
    });
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, createStudentSchema);
    const result = await createStudent(input, session.userId);
    return created(result);
  });
}
