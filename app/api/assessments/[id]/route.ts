import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, noContent } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { assertCourseManageAccess } from "@/lib/services/access";
import { updateAssessmentSchema } from "@/lib/validation/assessment";
import {
  deleteAssessment,
  getAssessmentById,
  updateAssessment,
} from "@/lib/services/assessment.service";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const assessment = await getAssessmentById(params.id);
    await assertCourseManageAccess(session, assessment.course.id);
    return ok(assessment);
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const current = await getAssessmentById(params.id);
    await assertCourseManageAccess(session, current.course.id);
    const input = await parseJson(req, updateAssessmentSchema);
    return ok(await updateAssessment(params.id, input, session.userId));
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const current = await getAssessmentById(params.id);
    await assertCourseManageAccess(session, current.course.id);
    await deleteAssessment(params.id, session.userId);
    return noContent();
  });
}
