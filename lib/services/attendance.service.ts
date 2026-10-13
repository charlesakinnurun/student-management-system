import { prisma } from "@/lib/db";
import { notFound } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import type { ListQuery } from "@/lib/http/pagination";
import { computeAttendance, type AttendanceTally } from "@/lib/domain/grading";
import type { BulkAttendanceInput } from "@/lib/validation/attendance";
import type { Actor } from "@/lib/services/score.service";

/** Normalise to UTC midnight so one calendar day == one attendance row. */
export function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Idempotently mark attendance for a course on a date. Re-submitting the same
 * date updates existing rows instead of creating duplicates (enforced by the
 * `[enrollmentId, date]` unique index).
 */
export async function bulkMarkAttendance(input: BulkAttendanceInput, actor: Actor) {
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { id: true, code: true },
  });
  if (!course) throw notFound("Course not found");

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: input.courseId, status: "ACTIVE" },
    select: { id: true },
  });
  const validIds = new Set(enrollments.map((e) => e.id));
  const date = startOfDayUtc(input.date);

  const records = input.records.filter((record) => validIds.has(record.enrollmentId));

  await prisma.$transaction(
    records.map((record) =>
      prisma.attendance.upsert({
        where: { enrollmentId_date: { enrollmentId: record.enrollmentId, date } },
        update: { status: record.status, markedBy: actor.staffProfileId ?? actor.userId },
        create: {
          enrollmentId: record.enrollmentId,
          date,
          status: record.status,
          markedBy: actor.staffProfileId ?? actor.userId,
        },
      }),
    ),
  );

  await recordAudit({
    actorId: actor.userId,
    action: "attendance.mark",
    resource: "Attendance",
    resourceId: input.courseId,
    metadata: { courseCode: course.code, date: date.toISOString(), count: records.length },
  });

  return { marked: records.length, skipped: input.records.length - records.length };
}

/** Raw attendance list with pagination + filters. */
export async function listAttendance(query: ListQuery, filters: { courseId?: string; date?: Date }) {
  const where = {
    ...(filters.courseId ? { enrollment: { courseId: filters.courseId } } : {}),
    ...(filters.date ? { date: startOfDayUtc(filters.date) } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.attendance.findMany({
      where,
      select: {
        id: true,
        date: true,
        status: true,
        enrollment: {
          select: {
            id: true,
            student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
            course: { select: { id: true, code: true } },
          },
        },
      },
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
    }),
    prisma.attendance.count({ where }),
  ]);
  return { items, total };
}

export interface CourseAttendanceRow {
  enrollmentId: string;
  student: { id: string; studentId: string; firstName: string; lastName: string };
  tally: AttendanceTally;
  records: Record<string, string>; // ISO date → status
}

/** Attendance matrix for a course: per-student tally + per-date status map. */
export async function getCourseAttendance(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, code: true, title: true },
  });
  if (!course) throw notFound("Course not found");

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "ACTIVE" },
    select: {
      id: true,
      student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
      attendance: { select: { date: true, status: true }, orderBy: { date: "asc" } },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  const dates = [...new Set(enrollments.flatMap((e) => e.attendance.map((a) => a.date.toISOString())))]
    .sort()
    .slice(-10); // most recent 10 sessions

  const rows: CourseAttendanceRow[] = enrollments.map((enrollment) => ({
    enrollmentId: enrollment.id,
    student: enrollment.student,
    tally: computeAttendance(enrollment.attendance),
    records: Object.fromEntries(enrollment.attendance.map((a) => [a.date.toISOString(), a.status])),
  }));

  const courseTally = computeAttendance(enrollments.flatMap((e) => e.attendance));

  return { course, dates, rows, courseTally };
}

export interface StudentAttendanceCourse {
  course: { id: string; code: string; title: string };
  tally: AttendanceTally;
}

/** Per-course attendance tallies plus an overall figure for a student. */
export async function getStudentAttendance(studentId: string, sessionId?: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, ...(sessionId ? { sessionId } : {}) },
    select: {
      course: { select: { id: true, code: true, title: true } },
      attendance: { select: { status: true } },
    },
  });

  const courses: StudentAttendanceCourse[] = enrollments.map((enrollment) => ({
    course: enrollment.course,
    tally: computeAttendance(enrollment.attendance),
  }));

  const overall = computeAttendance(enrollments.flatMap((e) => e.attendance));
  return { courses, overall };
}

/** Attendance tally for a single enrolment (student course detail page). */
export async function getEnrollmentAttendance(enrollmentId: string) {
  const records = await prisma.attendance.findMany({
    where: { enrollmentId },
    select: { id: true, date: true, status: true },
    orderBy: { date: "desc" },
  });
  return { records, tally: computeAttendance(records) };
}
