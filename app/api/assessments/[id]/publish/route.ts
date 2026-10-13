import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { getAssessmentById, setAssessmentPublished } from "@/lib/services/assessment.service";
import { assertCourseManageAccess } from "@/lib/services/access";

type Ctx = { params: { id: string } };

const publishSchema = z.object({ isPublished: z.coerce.boolean() });

/** PATCH /api/assessments/:id/publish — publish or retract results. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const assessment = await getAssessmentById(params.id);
    await assertCourseManageAccess(session, assessment.course.id);
    const input = await parseJson(req, publishSchema);
    return ok(await setAssessmentPublished(params.id, input.isPublished, session.userId));
  });
}
