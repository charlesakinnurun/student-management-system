import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { getAssessmentById } from "@/lib/services/assessment.service";
import { assertCourseManageAccess } from "@/lib/services/access";
import { getAssessmentScores } from "@/lib/services/score.service";

type Ctx = { params: { id: string } };

/** GET /api/assessments/:id/scores — roster + entered scores for score entry. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const assessment = await getAssessmentById(params.id);
    await assertCourseManageAccess(session, assessment.course.id);
    return ok(await getAssessmentScores(params.id));
  });
}
