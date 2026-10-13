import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { assertCourseManageAccess } from "@/lib/services/access";
import { getCourseAttendance } from "@/lib/services/attendance.service";

type Ctx = { params: { id: string } };

/** GET /api/courses/:id/attendance — attendance matrix + tallies. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    await assertCourseManageAccess(session, params.id);
    return ok(await getCourseAttendance(params.id));
  });
}
