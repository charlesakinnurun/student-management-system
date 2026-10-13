import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { upsertGradingSetSchema } from "@/lib/validation/user";
import { listGradingSets, upsertGradingSet } from "@/lib/services/grading-rule.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN", "LECTURER");
    return ok(await listGradingSets());
  });
}

/** PUT /api/grading-rules — replace the bands of a grading set atomically. */
export async function PUT(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, upsertGradingSetSchema);
    return ok(await upsertGradingSet(input, session.userId));
  });
}
