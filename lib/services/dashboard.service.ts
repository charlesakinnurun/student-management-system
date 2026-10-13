import { prisma } from "@/lib/db";
import { round } from "@/lib/utils";
import { computeAttendance } from "@/lib/domain/grading";
import { listLecturerCourses } from "@/lib/services/course.service";
import { getStudentAttendance } from "@/lib/services/attendance.service";
import { getStudentResults } from "@/lib/services/score.service";

/**
 * Dashboard aggregations.
 *
 * Performance/attendance figures are computed with grouped SQL aggregates
 * (one row per assessment / status) rather than loading every score or
 * attendance row into memory — important at thousands-of-students scale.
 */

async function averageScorePercentage(courseIds?: string[]): Promise<number | null> {
  const grouped = await prisma.score.groupBy({
    by: ["assessmentId"],
    where: courseIds ? { assessment: { courseId: { in: courseIds } } } : {},
    _sum: { rawScore: true },
    _count: { _all: true },
  });
  if (grouped.length === 0) return null;

  const assessments = await prisma.assessment.findMany({
    where: { id: { in: grouped.map((g) => g.assessmentId) } },
    select: { id: true, maxScore: true },
  });
  const maxById = new Map(assessments.map((a) => [a.id, a.maxScore]));

  let earned = 0;
  let possible = 0;
  for (const group of grouped) {
    const max = maxById.get(group.assessmentId) ?? 0;
    earned += group._sum.rawScore ?? 0;
    possible += max * (group._count._all ?? 0);
  }
  return possible > 0 ? round((earned / possible) * 100, 1) : null;
}

async function attendanceSummary(courseIds?: string[]) {
  const grouped = await prisma.attendance.groupBy({
    by: ["status"],
    where: courseIds ? { enrollment: { courseId: { in: courseIds } } } : {},
    _count: { _all: true },
  });
  const records = grouped.flatMap((group) =>
    Array.from({ length: group._count._all ?? 0 }, () => ({ status: group.status })),
  );
  return computeAttendance(records);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function getAdminDashboard() {
  const [
    totalStudents,
    totalStaff,
    totalDepartments,
    totalFaculties,
    activeCourses,
    currentSession,
    currentSemester,
    recentEnrollments,
    attendance,
    performance,
    feeAggregate,
    feeGroups,
    recentAnnouncements,
    enrollmentByStatus,
  ] = await Promise.all([
    prisma.studentProfile.count(),
    prisma.staffProfile.count(),
    prisma.department.count(),
    prisma.faculty.count(),
    prisma.course.count(),
    prisma.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true, name: true } }),
    prisma.semester.findFirst({ where: { isCurrent: true }, select: { id: true, name: true } }),
    prisma.enrollment.findMany({
      take: 6,
      orderBy: { enrolledAt: "desc" },
      select: {
        id: true,
        enrolledAt: true,
        student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
        course: { select: { id: true, code: true, title: true } },
      },
    }),
    attendanceSummary(),
    averageScorePercentage(),
    prisma.fee.aggregate({ _sum: { amountDue: true, amountPaid: true } }),
    prisma.fee.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.announcement.findMany({
      take: 3,
      orderBy: { publishedAt: "desc" },
      select: { id: true, title: true, audience: true, publishedAt: true },
    }),
    prisma.studentProfile.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const amountDue = feeAggregate._sum.amountDue ?? 0;
  const amountPaid = feeAggregate._sum.amountPaid ?? 0;

  return {
    totals: {
      students: totalStudents,
      staff: totalStaff,
      departments: totalDepartments,
      faculties: totalFaculties,
      courses: activeCourses,
    },
    currentSession,
    currentSemester,
    recentEnrollments,
    attendance,
    performance: { averageScorePercentage: performance },
    fees: {
      amountDue,
      amountPaid,
      outstanding: round(amountDue - amountPaid, 2),
      collectionRate: amountDue > 0 ? round((amountPaid / amountDue) * 100, 1) : 0,
      byStatus: Object.fromEntries(feeGroups.map((g) => [g.status, g._count._all])),
    },
    studentsByStatus: Object.fromEntries(enrollmentByStatus.map((g) => [g.status, g._count._all])),
    recentAnnouncements,
  };
}

// ---------------------------------------------------------------------------
// Lecturer
// ---------------------------------------------------------------------------

export async function getLecturerDashboard(staffId: string) {
  const courses = await listLecturerCourses(staffId);
  const courseIds = courses.map((c) => c.id);
  const totalStudents = new Set(
    (
      await prisma.enrollment.findMany({
        where: { courseId: { in: courseIds }, status: "ACTIVE" },
        select: { studentId: true },
      })
    ).map((e) => e.studentId),
  ).size;

  const [upcomingAssessments, attendance, performance, recentGrades] = await Promise.all([
    prisma.assessment.findMany({
      where: { courseId: { in: courseIds }, dueDate: { gte: new Date() } },
      take: 5,
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        dueDate: true,
        course: { select: { id: true, code: true, title: true } },
      },
    }),
    attendanceSummary(courseIds),
    averageScorePercentage(courseIds),
    prisma.score.findMany({
      where: { assessment: { courseId: { in: courseIds } } },
      take: 6,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        rawScore: true,
        updatedAt: true,
        assessment: { select: { id: true, title: true, maxScore: true, course: { select: { code: true } } } },
        enrollment: {
          select: { student: { select: { id: true, studentId: true, firstName: true, lastName: true } } },
        },
      },
    }),
  ]);

  // Per-course average percentage for the performance panel.
  const perCourse = await Promise.all(
    courses.slice(0, 6).map(async (course) => ({
      course: { id: course.id, code: course.code, title: course.title },
      students: course._count.enrollments,
      average: await averageScorePercentage([course.id]),
    })),
  );

  return {
    courses,
    totals: { courses: courses.length, students: totalStudents },
    upcomingAssessments,
    attendance,
    performance: { averageScorePercentage: performance, perCourse },
    recentGrades,
  };
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

export async function getStudentDashboard(studentId: string) {
  const [profile, currentSession, currentSemester, attendance, results] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        level: true,
        photoUrl: true,
        department: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true, name: true } }),
    prisma.semester.findFirst({
      where: { isCurrent: true },
      select: { id: true, name: true, session: { select: { id: true, name: true } } },
    }),
    getStudentAttendance(studentId),
    getStudentResults(studentId),
  ]);

  // Current-term courses + upcoming assessments + recent published grades.
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
      ...(currentSemester ? { semesterId: currentSemester.id } : {}),
    },
    select: {
      id: true,
      course: { select: { id: true, code: true, title: true, creditUnits: true } },
      semester: { select: { id: true, name: true } },
    },
  });
  const courseIds = enrollments.map((e) => e.course.id);

  const [upcomingAssessments, recentGrades, announcements] = await Promise.all([
    prisma.assessment.findMany({
      where: { courseId: { in: courseIds }, dueDate: { gte: new Date() } },
      take: 5,
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        dueDate: true,
        maxScore: true,
        course: { select: { code: true, title: true } },
      },
    }),
    prisma.score.findMany({
      where: { enrollment: { studentId }, assessment: { isPublished: true } },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        rawScore: true,
        assessment: { select: { title: true, maxScore: true, course: { select: { code: true } } } },
      },
    }),
    prisma.announcement.findMany({
      where: {
        OR: [
          { audience: { in: ["ALL", "STUDENT"] } },
          { courseId: { in: courseIds } },
        ],
      },
      take: 4,
      orderBy: { publishedAt: "desc" },
      select: { id: true, title: true, body: true, publishedAt: true },
    }),
  ]);

  const latestTerm = results.terms.at(-1);

  return {
    profile,
    currentSession,
    currentSemester: currentSemester ?? undefined,
    courses: enrollments.map((e) => ({ ...e.course, term: e.semester.name })),
    gpa: latestTerm?.gpa ?? null,
    totalCredits: latestTerm?.totalCredits ?? 0,
    attendance,
    upcomingAssessments,
    recentGrades,
    announcements,
  };
}
