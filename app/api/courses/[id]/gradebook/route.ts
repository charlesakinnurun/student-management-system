import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { assertCourseManageAccess } from "@/lib/services/access";
import { getCourseGradebook } from "@/lib/services/score.service";

type Ctx = { params: { id: string } };

/** GET /api/courses/:id/gradebook — computed totals and letter grades. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    await assertCourseManageAccess(session, params.id);
    return ok(await getCourseGradebook(params.id));
  });
}
