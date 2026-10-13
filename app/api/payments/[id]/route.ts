import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { noContent } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { deletePayment } from "@/lib/services/fee.service";

type Ctx = { params: { id: string } };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    await deletePayment(params.id, { userId: session.userId, staffProfileId: session.staffProfileId });
    return noContent();
  });
}
