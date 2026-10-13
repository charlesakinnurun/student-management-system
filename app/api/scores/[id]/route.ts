import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { noContent } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/http/errors";
import { assertLecturerOwnsAssessment } from "@/lib/services/access";
import { deleteScore } from "@/lib/services/score.service";

type Ctx = { params: { id: string } };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const score = await prisma.score.findUnique({
      where: { id: params.id },
      select: { assessmentId: true },
    });
    if (!score) throw notFound("Score not found");
    if (session.role === "LECTURER") {
      if (!session.staffProfileId) throw notFound("Lecturer profile missing");
      await assertLecturerOwnsAssessment(session.staffProfileId, score.assessmentId);
    }
    await deleteScore(params.id, { userId: session.userId, staffProfileId: session.staffProfileId });
    return noContent();
  });
}
