import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, noContent } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { updateFeeSchema } from "@/lib/validation/fee";
import { deleteFee, getFeeById, updateFee } from "@/lib/services/fee.service";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN");
    return ok(await getFeeById(params.id));
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, updateFeeSchema);
    return ok(await updateFee(params.id, input, { userId: session.userId, staffProfileId: session.staffProfileId }));
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    await deleteFee(params.id, { userId: session.userId, staffProfileId: session.staffProfileId });
    return noContent();
  });
}
