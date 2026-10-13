import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { bulkEnrollSchema } from "@/lib/validation/enrollment";
import { bulkEnrollStudent } from "@/lib/services/enrollment.service";

/** POST /api/enrollments/bulk — enrol one student into many courses. */
export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, bulkEnrollSchema);
    return ok(await bulkEnrollStudent(input, session.userId));
  });
}
