import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, noContent } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { assertLecturerOwnsCourse } from "@/lib/services/access";
import { forbidden } from "@/lib/http/errors";
import { updateCourseSchema } from "@/lib/validation/course";
import { deleteCourse, getCourseById, updateCourse } from "@/lib/services/course.service";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    if (session.role === "LECTURER" && session.staffProfileId) {
      await assertLecturerOwnsCourse(session.staffProfileId, params.id);
    } else if (session.role !== "ADMIN") {
      throw forbidden();
    }
    return ok(await getCourseById(params.id));
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, updateCourseSchema);
    return ok(await updateCourse(params.id, input, session.userId));
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    await deleteCourse(params.id, session.userId);
    return noContent();
  });
}
