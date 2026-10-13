import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDatabase, seedFixture, type Fixture } from "../helpers/db";
import { createStudent } from "@/lib/services/student.service";
import { createEnrollment } from "@/lib/services/enrollment.service";
import {
  bulkMarkAttendance,
  getCourseAttendance,
  getStudentAttendance,
} from "@/lib/services/attendance.service";

let fixture: Fixture;
let enrollmentId: string;
let studentDbId: string;

const actor = () => ({ userId: fixture.adminId, staffProfileId: fixture.staffId });
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

beforeEach(async () => {
  await resetDatabase();
  fixture = await seedFixture();
  const student = await createStudent(
    { firstName: "Ada", lastName: "Nwosu", email: "ada@test.edu", departmentId: fixture.departmentId },
    fixture.adminId,
  );
  studentDbId = student.student.id;
  const enrollment = await createEnrollment(
    {
      studentId: studentDbId,
      courseId: fixture.courseId,
      sessionId: fixture.sessionId,
      semesterId: fixture.semesterId,
    },
    fixture.adminId,
  );
  enrollmentId = enrollment.id;
});

describe("attendance tracking", () => {
  it("marks attendance for a course on a date", async () => {
    const result = await bulkMarkAttendance(
      {
        courseId: fixture.courseId,
        date: day("2026-01-05"),
        records: [{ enrollmentId, status: "PRESENT" }],
      },
      actor(),
    );
    expect(result.marked).toBe(1);
    expect(await prisma.attendance.count()).toBe(1);
  });

  it("is idempotent: re-marking the same date updates rather than duplicates", async () => {
    await bulkMarkAttendance(
      { courseId: fixture.courseId, date: day("2026-01-05"), records: [{ enrollmentId, status: "PRESENT" }] },
      actor(),
    );
    await bulkMarkAttendance(
      { courseId: fixture.courseId, date: day("2026-01-05"), records: [{ enrollmentId, status: "ABSENT" }] },
      actor(),
    );

    const records = await prisma.attendance.findMany();
    expect(records).toHaveLength(1);
    expect(records[0]?.status).toBe("ABSENT");
  });

  it("ignores records for students not enrolled in the course", async () => {
    const result = await bulkMarkAttendance(
      {
        courseId: fixture.courseId,
        date: day("2026-01-05"),
        records: [{ enrollmentId: "nope", status: "PRESENT" }],
      },
      actor(),
    );
    expect(result.marked).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it("computes a student's attendance percentage, excluding excused absences", async () => {
    const statuses = ["PRESENT", "PRESENT", "LATE", "ABSENT", "EXCUSED"] as const;
    for (const [index, status] of statuses.entries()) {
      await bulkMarkAttendance(
        {
          courseId: fixture.courseId,
          date: day(`2026-01-0${index + 1}`),
          records: [{ enrollmentId, status }],
        },
        actor(),
      );
    }

    const { overall, courses } = await getStudentAttendance(studentDbId);
    // attended = present(2) + late(1) = 3; denominator = 5 - excused(1) = 4
    expect(overall.percentage).toBe(75);
    expect(courses[0]?.tally).toMatchObject({ present: 2, late: 1, absent: 1, excused: 1 });
  });

  it("returns a course attendance matrix with tallies", async () => {
    await bulkMarkAttendance(
      { courseId: fixture.courseId, date: day("2026-01-05"), records: [{ enrollmentId, status: "PRESENT" }] },
      actor(),
    );
    const matrix = await getCourseAttendance(fixture.courseId);
    expect(matrix.rows).toHaveLength(1);
    expect(matrix.rows[0]?.tally.percentage).toBe(100);
    expect(matrix.dates).toHaveLength(1);
  });
});
