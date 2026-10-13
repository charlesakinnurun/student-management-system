import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { forbidden } from "@/lib/http/errors";
import { listStudentFees } from "@/lib/services/fee.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("STUDENT");
    if (!session.studentProfileId) throw forbidden("No student profile is linked to this account");
    return ok(await listStudentFees(session.studentProfileId));
  });
}
