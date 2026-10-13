import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole } from "@/lib/auth/session";
import { createCourseSchema } from "@/lib/validation/course";
import { createCourse, listCourses } from "@/lib/services/course.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["createdAt", "code", "title", "level"],
      defaultSort: "code",
      defaultOrder: "asc",
    });
    const params = req.nextUrl.searchParams;
    // A lecturer only ever sees their own courses, regardless of query params.
    const lecturerId =
      session.role === "LECTURER" ? session.staffProfileId ?? "none" : params.get("lecturerId") ?? undefined;
    const { items, total } = await listCourses(query, {
      departmentId: params.get("departmentId") ?? undefined,
      level: params.get("level") ?? undefined,
      semesterId: params.get("semesterId") ?? undefined,
      sessionId: params.get("sessionId") ?? undefined,
      lecturerId,
    });
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, createCourseSchema);
    return created(await createCourse(input, session.userId));
  });
}
