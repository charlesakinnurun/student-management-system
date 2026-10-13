import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { forbidden } from "@/lib/http/errors";
import { assertLecturerOwnsAssessment } from "@/lib/services/access";
import { upsertScoreSchema } from "@/lib/validation/score";
import { upsertScore } from "@/lib/services/score.service";

/** POST /api/scores — create or update a single score (records grade history). */
export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const input = await parseJson(req, upsertScoreSchema);
    if (session.role === "LECTURER") {
      if (!session.staffProfileId) throw forbidden("No lecturer profile is linked to this account");
      await assertLecturerOwnsAssessment(session.staffProfileId, input.assessmentId);
    }
    const score = await upsertScore(input, {
      userId: session.userId,
      staffProfileId: session.staffProfileId,
    });
    return ok(score);
  });
}
