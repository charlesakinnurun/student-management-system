import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole, type Session } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { assertCourseManageAccess } from "@/lib/services/access";
import { createAnnouncementSchema } from "@/lib/validation/announcement";
import { createAnnouncement, listAnnouncements, type AudienceScope } from "@/lib/services/announcement.service";

/** Derive the visibility scope for the acting user from their own records. */
async function scopeFor(session: Session): Promise<AudienceScope> {
  if (session.role === "ADMIN") return { role: "ADMIN" };

  if (session.role === "LECTURER" && session.staffProfileId) {
    const assignments = await prisma.courseAssignment.findMany({
      where: { staffId: session.staffProfileId },
      select: { courseId: true },
    });
    return { role: "LECTURER", courseIds: [...new Set(assignments.map((a) => a.courseId))] };
  }

  if (session.role === "STUDENT" && session.studentProfileId) {
    const [enrollments, profile] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId: session.studentProfileId },
        select: { courseId: true },
      }),
      prisma.studentProfile.findUnique({
        where: { id: session.studentProfileId },
        select: { departmentId: true },
      }),
    ]);
    return {
      role: "STUDENT",
      courseIds: [...new Set(enrollments.map((e) => e.courseId))],
      departmentId: profile?.departmentId ?? null,
    };
  }

  return { role: session.role };
}

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER", "STUDENT");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["publishedAt", "title", "createdAt"],
      defaultSort: "publishedAt",
    });
    const scope = await scopeFor(session);
    const { items, total } = await listAnnouncements(query, scope, {
      audience: req.nextUrl.searchParams.get("audience") ?? undefined,
      courseId: req.nextUrl.searchParams.get("courseId") ?? undefined,
    });
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const input = await parseJson(req, createAnnouncementSchema);
    if (input.courseId) await assertCourseManageAccess(session, input.courseId);
    return created(
      await createAnnouncement(input, { userId: session.userId, staffProfileId: session.staffProfileId }),
    );
  });
}
