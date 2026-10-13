import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { created } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { assignLecturerSchema } from "@/lib/validation/course";
import { assignLecturer } from "@/lib/services/course.service";

/** POST /api/course-assignments — assign a lecturer to a course for a session. */
export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, assignLecturerSchema);
    return created(await assignLecturer(input.courseId, input.staffId, input.sessionId, session.userId));
  });
}
