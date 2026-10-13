import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, noContent } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { updateSemesterSchema } from "@/lib/validation/session";
import { deleteSemester, getSemesterById, updateSemester } from "@/lib/services/session.service";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN", "LECTURER");
    return ok(await getSemesterById(params.id));
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, updateSemesterSchema);
    return ok(await updateSemester(params.id, input, session.userId));
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    await deleteSemester(params.id, session.userId);
    return noContent();
  });
}
