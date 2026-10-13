import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, noContent } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { updateStaffSchema } from "@/lib/validation/staff";
import { deleteStaff, getStaffDetail, updateStaff } from "@/lib/services/staff.service";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN", "LECTURER");
    return ok(await getStaffDetail(params.id));
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, updateStaffSchema);
    return ok(await updateStaff(params.id, input, session.userId));
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    await deleteStaff(params.id, session.userId);
    return noContent();
  });
}
