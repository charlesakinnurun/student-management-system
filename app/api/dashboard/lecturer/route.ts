import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { forbidden } from "@/lib/http/errors";
import { getLecturerDashboard } from "@/lib/services/dashboard.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("LECTURER");
    if (!session.staffProfileId) throw forbidden("No lecturer profile is linked to this account");
    return ok(await getLecturerDashboard(session.staffProfileId));
  });
}
