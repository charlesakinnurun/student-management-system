import { prisma } from "@/lib/db";
import { conflict, notFound, unprocessable } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import type { ListQuery } from "@/lib/http/pagination";
import type { BulkEnrollInput, CreateEnrollmentInput } from "@/lib/validation/enrollment";
import type { EnrollmentStatus } from "@/lib/domain/enums";

export const enrollmentSelect = {
  id: true,
  status: true,
  enrolledAt: true,
  updatedAt: true,
  student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
  course: { select: { id: true, code: true, title: true, creditUnits: true, level: true } },
  session: { select: { id: true, name: true } },
  semester: { select: { id: true, name: true } },
} as const;

export interface EnrollmentFilters {
  studentId?: string;
  courseId?: string;
  sessionId?: string;
  semesterId?: string;
  status?: string;
  lecturerId?: string;
}

export async function listEnrollments(query: ListQuery, filters: EnrollmentFilters) {
  const where = {
    ...(filters.studentId ? { studentId: filters.studentId } : {}),
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(filters.sessionId ? { sessionId: filters.sessionId } : {}),
    ...(filters.semesterId ? { semesterId: filters.semesterId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.lecturerId ? { course: { assignments: { some: { staffId: filters.lecturerId } } } } : {}),
    ...(query.q
      ? {
          OR: [
            { student: { studentId: { contains: query.q } } },
            { student: { firstName: { contains: query.q } } },
            { student: { lastName: { contains: query.q } } },
            { course: { code: { contains: query.q } } },
            { course: { title: { contains: query.q } } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.enrollment.findMany({
      where,
      select: enrollmentSelect,
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
    }),
    prisma.enrollment.count({ where }),
  ]);
  return { items, total };
}

export async function getEnrollmentById(id: string) {
  const enrollment = await prisma.enrollment.findUnique({ where: { id }, select: enrollmentSelect });
  if (!enrollment) throw notFound("Enrollment not found");
  return enrollment;
}

/** Validate that all referenced rows exist and are mutually consistent. */
async function assertEnrollmentTarget(input: {
  studentId: string;
  courseId: string;
  sessionId: string;
  semesterId: string;
}) {
  const [student, course, semester] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { id: input.studentId }, select: { id: true, status: true } }),
    prisma.course.findUnique({ where: { id: input.courseId }, select: { id: true, semesterId: true } }),
    prisma.semester.findUnique({ where: { id: input.semesterId }, select: { id: true, sessionId: true } }),
  ]);
  if (!student) throw notFound("Student not found");
  if (!course) throw notFound("Course not found");
  if (!semester) throw notFound("Semester not found");
  if (semester.sessionId !== input.sessionId) {
    throw unprocessable("The selected semester does not belong to the selected session");
  }
  if (student.status === "WITHDRAWN") {
    throw unprocessable("Withdrawn students cannot be enrolled");
  }
  return { course };
}

export async function createEnrollment(input: CreateEnrollmentInput, actorId: string) {
  await assertEnrollmentTarget(input);

  // Explicit pre-check gives a friendly 409 (the unique index is the real guard).
  const duplicate = await prisma.enrollment.findFirst({
    where: {
      studentId: input.studentId,
      courseId: input.courseId,
      sessionId: input.sessionId,
      semesterId: input.semesterId,
    },
    select: { id: true },
  });
  if (duplicate) throw conflict("This student is already enrolled in the course for this term");

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: input.studentId,
      courseId: input.courseId,
      sessionId: input.sessionId,
      semesterId: input.semesterId,
      status: input.status ?? "ACTIVE",
    },
    select: enrollmentSelect,
  });

  await recordAudit({
    actorId,
    action: "enrollment.create",
    resource: "Enrollment",
    resourceId: enrollment.id,
    metadata: { studentId: input.studentId, courseId: input.courseId },
  });
  return enrollment;
}

export interface BulkEnrollResult {
  created: number;
  skipped: Array<{ courseId: string; reason: string }>;
}

/** Enrol one student into many courses, reporting per-course skips. */
export async function bulkEnrollStudent(input: BulkEnrollInput, actorId: string): Promise<BulkEnrollResult> {
  if (input.courseIds.length === 0) throw unprocessable("Select at least one course");

  const result: BulkEnrollResult = { created: 0, skipped: [] };

  for (const courseId of input.courseIds) {
    try {
      await assertEnrollmentTarget({
        studentId: input.studentId,
        courseId,
        sessionId: input.sessionId,
        semesterId: input.semesterId,
      });
      const existing = await prisma.enrollment.findFirst({
        where: {
          studentId: input.studentId,
          courseId,
          sessionId: input.sessionId,
          semesterId: input.semesterId,
        },
        select: { id: true },
      });
      if (existing) {
        result.skipped.push({ courseId, reason: "Already enrolled" });
        continue;
      }
      await prisma.enrollment.create({
        data: {
          studentId: input.studentId,
          courseId,
          sessionId: input.sessionId,
          semesterId: input.semesterId,
          status: "ACTIVE",
        },
      });
      result.created += 1;
    } catch (error) {
      result.skipped.push({
        courseId,
        reason: error instanceof Error ? error.message : "Failed",
      });
    }
  }

  await recordAudit({
    actorId,
    action: "enrollment.bulk_create",
    resource: "Enrollment",
    metadata: { studentId: input.studentId, created: result.created, skipped: result.skipped.length },
  });
  return result;
}

export async function updateEnrollmentStatus(id: string, status: EnrollmentStatus, actorId: string) {
  const existing = await prisma.enrollment.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!existing) throw notFound("Enrollment not found");

  const enrollment = await prisma.enrollment.update({
    where: { id },
    data: { status },
    select: enrollmentSelect,
  });
  await recordAudit({
    actorId,
    action: "enrollment.update",
    resource: "Enrollment",
    resourceId: id,
    metadata: { from: existing.status, to: status },
  });
  return enrollment;
}

export async function deleteEnrollment(id: string, actorId: string) {
  const existing = await prisma.enrollment.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Enrollment not found");
  await prisma.enrollment.delete({ where: { id } });
  await recordAudit({ actorId, action: "enrollment.delete", resource: "Enrollment", resourceId: id });
}

/** Courses a student is enrolled in, optionally scoped to a session. */
export async function listStudentEnrollments(studentId: string, sessionId?: string) {
  return prisma.enrollment.findMany({
    where: { studentId, ...(sessionId ? { sessionId } : {}) },
    select: enrollmentSelect,
    orderBy: { enrolledAt: "desc" },
  });
}

/** Roster for a course (used by attendance and score entry screens). */
export async function listCourseRoster(courseId: string, sessionId?: string) {
  return prisma.enrollment.findMany({
    where: { courseId, status: "ACTIVE", ...(sessionId ? { sessionId } : {}) },
    select: {
      id: true,
      student: {
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          level: true,
        },
      },
    },
    orderBy: { student: { lastName: "asc" } },
  });
}
