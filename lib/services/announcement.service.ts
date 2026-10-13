import { prisma } from "@/lib/db";
import { notFound } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import type { ListQuery } from "@/lib/http/pagination";
import type { AnnouncementAudience, UserRole } from "@/lib/domain/enums";
import type { CreateAnnouncementInput } from "@/lib/validation/announcement";
import type { Actor } from "@/lib/services/score.service";

export const announcementSelect = {
  id: true,
  title: true,
  body: true,
  audience: true,
  courseId: true,
  departmentId: true,
  publishedAt: true,
  createdAt: true,
  author: { select: { id: true, email: true, role: true } },
} as const;

export interface AudienceScope {
  role: UserRole;
  /** Student's enrolled course ids / department — used to scope targeted posts. */
  courseIds?: string[];
  departmentId?: string | null;
}

/**
 * Build the visibility filter for the acting user. Admins see everything;
 * lecturers see institution-wide plus their own course posts; students see
 * institution-wide plus posts targeted at their courses/department.
 */
function audienceWhere(scope: AudienceScope) {
  const roleAudience = ["ALL", scope.role] as string[];
  const targeted =
    scope.role === "STUDENT"
      ? {
          OR: [
            { courseId: { in: scope.courseIds ?? [] } },
            ...(scope.departmentId ? [{ departmentId: scope.departmentId }] : []),
          ],
        }
      : scope.role === "LECTURER"
        ? { OR: [{ courseId: { in: scope.courseIds ?? [] } }] }
        : {};

  return {
    audience: { in: roleAudience },
    ...(scope.role === "ADMIN" ? {} : targeted),
  };
}

export async function listAnnouncements(
  query: ListQuery,
  scope: AudienceScope,
  filters: { audience?: string; courseId?: string } = {},
) {
  const where = {
    ...audienceWhere(scope),
    ...(filters.audience ? { audience: filters.audience } : {}),
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(query.q ? { OR: [{ title: { contains: query.q } }, { body: { contains: query.q } }] } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.announcement.findMany({
      where,
      select: announcementSelect,
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
    }),
    prisma.announcement.count({ where }),
  ]);
  return { items, total };
}

export async function getAnnouncementById(id: string) {  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: announcementSelect,
  });
  if (!announcement) throw notFound("Announcement not found");
  return announcement;
}

export async function createAnnouncement(input: CreateAnnouncementInput, actor: Actor) {
  const announcement = await prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      audience: input.audience as AnnouncementAudience,
      courseId: input.courseId,
      departmentId: input.departmentId,
      authorId: actor.userId,
    },
    select: announcementSelect,
  });

  await recordAudit({
    actorId: actor.userId,
    action: "announcement.create",
    resource: "Announcement",
    resourceId: announcement.id,
    metadata: { audience: input.audience },
  });
  return announcement;
}

export async function updateAnnouncement(
  id: string,
  input: Partial<CreateAnnouncementInput>,
  actor: Actor,
) {
  const existing = await prisma.announcement.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });
  if (!existing) throw notFound("Announcement not found");

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.body ? { body: input.body } : {}),
      ...(input.audience ? { audience: input.audience } : {}),
      ...(input.courseId !== undefined ? { courseId: input.courseId } : {}),
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
    },
    select: announcementSelect,
  });

  await recordAudit({
    actorId: actor.userId,
    action: "announcement.update",
    resource: "Announcement",
    resourceId: id,
  });
  return announcement;
}

export async function deleteAnnouncement(id: string, actor: Actor) {
  const existing = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Announcement not found");
  await prisma.announcement.delete({ where: { id } });
  await recordAudit({
    actorId: actor.userId,
    action: "announcement.delete",
    resource: "Announcement",
    resourceId: id,
  });
}

/**
 * Announcements visible to a specific student: institution-wide student notices
 * plus anything targeted at a course they are enrolled in or their department.
 */
export async function listAnnouncementsForStudent(studentId: string, take = 20) {
  const [enrollments, profile] = await Promise.all([
    prisma.enrollment.findMany({ where: { studentId }, select: { courseId: true } }),
    prisma.studentProfile.findUnique({ where: { id: studentId }, select: { departmentId: true } }),
  ]);

  const query: ListQuery = {
    page: 1,
    pageSize: take,
    skip: 0,
    take,
    q: "",
    sort: "publishedAt",
    order: "desc",
  };

  const { items } = await listAnnouncements(query, {
    role: "STUDENT",
    courseIds: [...new Set(enrollments.map((e) => e.courseId))],
    departmentId: profile?.departmentId ?? null,
  });
  return items;
}
