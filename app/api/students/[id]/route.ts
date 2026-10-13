import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, noContent } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { updateStudentSchema } from "@/lib/validation/student";
import { deleteStudent, getStudentDetail, updateStudent } from "@/lib/services/student.service";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN", "LECTURER");
    return ok(await getStudentDetail(params.id));
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, updateStudentSchema);
    return ok(await updateStudent(params.id, input, session.userId));
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    await deleteStudent(params.id, session.userId);
    return noContent();
  });
}
