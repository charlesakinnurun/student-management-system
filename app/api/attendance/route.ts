import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole } from "@/lib/auth/session";
import { badRequest } from "@/lib/http/errors";
import { assertCourseManageAccess } from "@/lib/services/access";
import { bulkAttendanceSchema } from "@/lib/validation/attendance";
import { bulkMarkAttendance, listAttendance } from "@/lib/services/attendance.service";
//
export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["date", "createdAt"],
      defaultSort: "date",
    });
    const courseId = req.nextUrl.searchParams.get("courseId") ?? undefined;
    if (session.role === "LECTURER") {
      if (!courseId) throw badRequest("A courseId filter is required");
      await assertCourseManageAccess(session, courseId);
    }
    const dateParam = req.nextUrl.searchParams.get("date");
    const { items, total } = await listAttendance(query, {
      courseId,
      date: dateParam ? new Date(dateParam) : undefined,
    });
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}

/** PUT /api/attendance — bulk, idempotent attendance marking for a course/date. */
export async function PUT(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const input = await parseJson(req, bulkAttendanceSchema);
    await assertCourseManageAccess(session, input.courseId);
    return ok(
      await bulkMarkAttendance(input, {
        userId: session.userId,
        staffProfileId: session.staffProfileId,
      }),
    );
  });
}
