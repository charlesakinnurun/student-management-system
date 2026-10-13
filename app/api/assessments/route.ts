import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole } from "@/lib/auth/session";
import { assertCourseManageAccess } from "@/lib/services/access";
import { createAssessmentSchema } from "@/lib/validation/assessment";
import { createAssessment, listAssessments } from "@/lib/services/assessment.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["dueDate", "createdAt", "title", "type"],
      defaultSort: "createdAt",
      defaultOrder: "asc",
    });
    const params = req.nextUrl.searchParams;
    const courseId = params.get("courseId") ?? undefined;
    // Lecturers are scoped to their own courses, whether or not they filter.
    let lecturerId: string | undefined;
    if (session.role === "LECTURER") {
      if (courseId) await assertCourseManageAccess(session, courseId);
      else if (session.staffProfileId) lecturerId = session.staffProfileId;
    }
    const { items, total } = await listAssessments(query, {
      courseId,
      type: params.get("type") ?? undefined,
      isPublished: params.get("isPublished") === null ? undefined : params.get("isPublished") === "true",
      lecturerId,
    });
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const input = await parseJson(req, createAssessmentSchema);
    await assertCourseManageAccess(session, input.courseId);
    return created(await createAssessment(input, session.userId, session.staffProfileId));
  });
}
