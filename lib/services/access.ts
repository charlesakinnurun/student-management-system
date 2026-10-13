import { prisma } from "@/lib/db";
import { forbidden, notFound } from "@/lib/http/errors";
import type { Session } from "@/lib/auth/session";

/**
 * Ownership/scope guards used for lecturer-scoped operations.
 * Kept separate from services so the rule lives in exactly one place.
 */

/** Admins can manage any course; lecturers only the courses they are assigned to. */
export async function assertCourseManageAccess(session: Session, courseId: string): Promise<void> {
  if (session.role === "ADMIN") return;
  if (session.role === "LECTURER" && session.staffProfileId) {
    await assertLecturerOwnsCourse(session.staffProfileId, courseId);
    return;
  }
  throw forbidden("You do not have access to this course");
}

/** Ensure a lecturer is assigned to the course (admins bypass this check upstream). */
export async function assertLecturerOwnsCourse(staffId: string, courseId: string): Promise<void> {
  const assignment = await prisma.courseAssignment.findFirst({
    where: { staffId, courseId },
    select: { id: true },
  });
  if (!assignment) throw forbidden("You are not assigned to this course");
}

/** Ensure a lecturer may act on an assessment (via its course). */
export async function assertLecturerOwnsAssessment(staffId: string, assessmentId: string): Promise<string> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, courseId: true },
  });
  if (!assessment) throw notFound("Assessment not found");
  await assertLecturerOwnsCourse(staffId, assessment.courseId);
  return assessment.courseId;
}

/** Ensure a lecturer may act on an enrolment (via its course). */
export async function assertLecturerOwnsEnrollment(staffId: string, enrollmentId: string): Promise<string> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, courseId: true },
  });
  if (!enrollment) throw notFound("Enrollment not found");
  await assertLecturerOwnsCourse(staffId, enrollment.courseId);
  return enrollment.courseId;
}
