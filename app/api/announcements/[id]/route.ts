import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, noContent } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { forbidden, notFound } from "@/lib/http/errors";
import { prisma } from "@/lib/db";
import { updateAnnouncementSchema } from "@/lib/validation/announcement";
import {
  deleteAnnouncement,
  getAnnouncementById,
  updateAnnouncement,
} from "@/lib/services/announcement.service";

type Ctx = { params: { id: string } };

/** Authors may edit their own posts; admins may edit any. */
async function assertCanModify(id: string, session: { userId: string; role: string }) {
  if (session.role === "ADMIN") return;
  const post = await prisma.announcement.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) throw notFound("Announcement not found");
  if (post.authorId !== session.userId) throw forbidden("You can only modify your own announcements");
}

export async function GET(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN", "LECTURER", "STUDENT");
    return ok(await getAnnouncementById(params.id));
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    await assertCanModify(params.id, session);
    const input = await parseJson(req, updateAnnouncementSchema);
    return ok(
      await updateAnnouncement(params.id, input, {
        userId: session.userId,
        staffProfileId: session.staffProfileId,
      }),
    );
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    await assertCanModify(params.id, session);
    await deleteAnnouncement(params.id, {
      userId: session.userId,
      staffProfileId: session.staffProfileId,
    });
    return noContent();
  });
}
