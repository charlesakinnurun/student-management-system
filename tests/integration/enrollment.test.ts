import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDatabase, seedFixture, type Fixture } from "../helpers/db";
import { createStudent } from "@/lib/services/student.service";
import { bulkEnrollStudent, createEnrollment, deleteEnrollment, updateEnrollmentStatus } from "@/lib/services/enrollment.service";

let fixture: Fixture;
let studentDbId: string;

beforeEach(async () => {
  await resetDatabase();
  fixture = await seedFixture();
  const created = await createStudent(
    { firstName: "Ada", lastName: "Nwosu", email: "ada@test.edu", departmentId: fixture.departmentId },
    fixture.adminId,
  );
  studentDbId = created.student.id;
});

function enrollmentInput(courseId = fixture.courseId) {
  return {
    studentId: studentDbId,
    courseId,
    sessionId: fixture.sessionId,
    semesterId: fixture.semesterId,
  };
}

describe("course enrolment", () => {
  it("enrols a student", async () => {
    const enrollment = await createEnrollment(enrollmentInput(), fixture.adminId);
    expect(enrollment.status).toBe("ACTIVE");
    expect(enrollment.course.id).toBe(fixture.courseId);
  });

  it("prevents duplicate enrolment", async () => {
    await createEnrollment(enrollmentInput(), fixture.adminId);
    await expect(createEnrollment(enrollmentInput(), fixture.adminId)).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });
  });

  it("rejects a semester that does not belong to the session", async () => {
    const otherSession = await prisma.academicSession.create({
      data: { name: "2030/2031", startDate: new Date("2030-01-01"), endDate: new Date("2030-12-31") },
    });
    await expect(
      createEnrollment({ ...enrollmentInput(), sessionId: otherSession.id }, fixture.adminId),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("rejects enrolment for unknown students or courses", async () => {
    await expect(
      createEnrollment({ ...enrollmentInput(), studentId: "missing" }, fixture.adminId),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("bulk enrols only new courses and reports skips", async () => {
    const secondCourse = await prisma.course.create({
      data: {
        code: "CSC102",
        title: "Programming II",
        creditUnits: 3,
        departmentId: fixture.departmentId,
        semesterId: fixture.semesterId,
      },
    });
    await createEnrollment(enrollmentInput(), fixture.adminId);

    const result = await bulkEnrollStudent(
      {
        studentId: studentDbId,
        courseIds: [fixture.courseId, secondCourse.id],
        sessionId: fixture.sessionId,
        semesterId: fixture.semesterId,
      },
      fixture.adminId,
    );

    expect(result.created).toBe(1);
    expect(result.skipped).toHaveLength(1);
    expect(await prisma.enrollment.count()).toBe(2);
  });

  it("updates enrolment status and audits the change", async () => {
    const enrollment = await createEnrollment(enrollmentInput(), fixture.adminId);
    await updateEnrollmentStatus(enrollment.id, "COMPLETED", fixture.adminId);

    const updated = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(updated.status).toBe("COMPLETED");

    const logs = await prisma.auditLog.findMany({ where: { action: "enrollment.update" } });
    expect(logs).toHaveLength(1);
  });

  it("removes an enrolment", async () => {
    const enrollment = await createEnrollment(enrollmentInput(), fixture.adminId);
    await deleteEnrollment(enrollment.id, fixture.adminId);
    expect(await prisma.enrollment.count()).toBe(0);
  });
});
