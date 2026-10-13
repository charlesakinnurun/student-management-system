import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { noContent } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { deleteGradingSet } from "@/lib/services/grading-rule.service";

type Ctx = { params: { setName: string } };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    await deleteGradingSet(decodeURIComponent(params.setName), session.userId);
    return noContent();
  });
}
