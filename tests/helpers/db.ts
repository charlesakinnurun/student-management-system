import { prisma } from "@/lib/db";

/**
 * Wipe the test database between tests. Order matters (children before parents)
 * because several relations use Restrict referential actions.
 */
export async function resetDatabase(): Promise<void> {
  await prisma.gradeHistory.deleteMany();
  await prisma.score.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.fee.deleteMany();
  await prisma.courseAssignment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.program.deleteMany();
  await prisma.department.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.academicSession.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.gradingRule.deleteMany();
  await prisma.user.deleteMany();
}

export interface Fixture {
  facultyId: string;
  departmentId: string;
  sessionId: string;
  semesterId: string;
  courseId: string;
  studentId: string;
  staffId: string;
  adminId: string;
}

/** Minimal, valid academic structure used by integration tests. */
export async function seedFixture(): Promise<Fixture> {
  const faculty = await prisma.faculty.create({
    data: { name: "Faculty of Science", code: `SCI-${Date.now()}` },
  });
  const department = await prisma.department.create({
    data: { name: "Computer Science", code: `CSC-${Date.now()}`, facultyId: faculty.id },
  });
  const session = await prisma.academicSession.create({
    data: { name: `2025/2026-${Date.now()}`, startDate: new Date("2025-09-01"), endDate: new Date("2026-07-31") },
  });
  const semester = await prisma.semester.create({
    data: {
      name: "First Semester",
      sessionId: session.id,
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-01-15"),
    },
  });
  const course = await prisma.course.create({
    data: {
      code: `CSC101-${Date.now()}`,
      title: "Introduction to Programming",
      creditUnits: 3,
      departmentId: department.id,
      semesterId: semester.id,
    },
  });

  const admin = await prisma.user.create({
    data: { email: `admin-${Date.now()}@test.edu`, passwordHash: "x", role: "ADMIN" },
  });
  const staffUser = await prisma.user.create({
    data: {
      email: `lecturer-${Date.now()}@test.edu`,
      passwordHash: "x",
      role: "LECTURER",
      staffProfile: {
        create: { staffId: `STF-${Date.now()}`, firstName: "Ada", lastName: "Okoro", departmentId: department.id },
      },
    },
    include: { staffProfile: true },
  });

  return {
    facultyId: faculty.id,
    departmentId: department.id,
    sessionId: session.id,
    semesterId: semester.id,
    courseId: course.id,
    studentId: "",
    staffId: staffUser.staffProfile!.id,
    adminId: admin.id,
  };
}
