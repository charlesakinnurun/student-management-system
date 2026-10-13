import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { forbidden } from "@/lib/http/errors";
import { assertLecturerOwnsAssessment } from "@/lib/services/access";
import { bulkScoreSchema } from "@/lib/validation/score";
import { bulkUpsertScores } from "@/lib/services/score.service";

/** POST /api/scores/bulk — save a whole assessment's score grid in one request. */
export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const input = await parseJson(req, bulkScoreSchema);
    if (session.role === "LECTURER") {
      if (!session.staffProfileId) throw forbidden("No lecturer profile is linked to this account");
      await assertLecturerOwnsAssessment(session.staffProfileId, input.assessmentId);
    }
    return ok(
      await bulkUpsertScores(input, { userId: session.userId, staffProfileId: session.staffProfileId }),
    );
  });
}
