import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { parseListQuery } from "@/lib/http/pagination";
import { resetDatabase, seedFixture, type Fixture } from "../helpers/db";
import {
  createStudent,
  deleteStudent,
  getStudentById,
  listStudents,
  updateStudent,
} from "@/lib/services/student.service";

const listQuery = parseListQuery(new URLSearchParams({}));
const noFilters = {};

let fixture: Fixture;

beforeEach(async () => {
  await resetDatabase();
  fixture = await seedFixture();
});

function studentInput(email = "jane.doe@test.edu") {
  return {
    firstName: "Jane",
    lastName: "Doe",
    email,
    facultyId: fixture.facultyId,
    departmentId: fixture.departmentId,
    sessionId: fixture.sessionId,
    level: "100",
  };
}

describe("student management", () => {
  it("creates a student with a generated ID and a hashed temporary password", async () => {
    const result = await createStudent(studentInput(), fixture.adminId);

    expect(result.student.studentId).toMatch(/^STU-\d{4}-\d{4}$/);
    expect(result.student.user.role).toBe("STUDENT");
    expect(result.temporaryPassword).toBeTruthy();

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "jane.doe@test.edu" } });
    expect(user.passwordHash).not.toBe(result.temporaryPassword);
    expect(user.passwordHash.startsWith("$2")).toBe(true);
    expect(user.role).toBe("STUDENT");
  });

  it("assigns sequential student IDs", async () => {
    const first = await createStudent(studentInput("a@test.edu"), fixture.adminId);
    const second = await createStudent(studentInput("b@test.edu"), fixture.adminId);

    expect(second.student.studentId).not.toBe(first.student.studentId);
    expect(Number(second.student.studentId.slice(-4))).toBe(
      Number(first.student.studentId.slice(-4)) + 1,
    );
  });

  it("rejects a duplicate email with a conflict", async () => {
    await createStudent(studentInput(), fixture.adminId);
    await expect(createStudent(studentInput(), fixture.adminId)).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });
  });

  it("rejects non-existent academic references", async () => {
    await expect(
      createStudent({ ...studentInput(), departmentId: "does-not-exist" }, fixture.adminId),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("lists students with search, pagination metadata and total", async () => {
    await createStudent(studentInput("jane@test.edu"), fixture.adminId);
    await createStudent({ ...studentInput("john@test.edu"), firstName: "John" }, fixture.adminId);

    const all = await listStudents(listQuery, noFilters);
    expect(all.total).toBe(2);

    const searched = await listStudents({ ...listQuery, q: "Jane" }, noFilters);
    expect(searched.total).toBe(1);
    expect(searched.items[0]?.firstName).toBe("Jane");
  });

  it("filters students by department and level", async () => {
    await createStudent(studentInput(), fixture.adminId);
    const filtered = await listStudents(listQuery, { departmentId: fixture.departmentId, level: "200" });
    expect(filtered.total).toBe(0);
  });

  it("updates a student's profile and email", async () => {
    const { student } = await createStudent(studentInput(), fixture.adminId);

    await updateStudent(
      student.id,
      { lastName: "Smith", email: "jane.smith@test.edu" },
      fixture.adminId,
    );

    const updated = await getStudentById(student.id);
    expect(updated.lastName).toBe("Smith");
    expect(updated.user.email).toBe("jane.smith@test.edu");
  });

  it("refuses to change an immutable student ID", async () => {
    const { student } = await createStudent(studentInput(), fixture.adminId);
    await expect(
      updateStudent(student.id, { studentId: "STU-1999-0001" }, fixture.adminId),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("deletes a student and cascades to the user account", async () => {
    const { student } = await createStudent(studentInput(), fixture.adminId);
    const userId = student.user.id;

    await deleteStudent(student.id, fixture.adminId);

    expect(await prisma.studentProfile.findUnique({ where: { id: student.id } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
  });

  it("records an audit event when a student is created", async () => {
    const { student } = await createStudent(studentInput(), fixture.adminId);
    const logs = await prisma.auditLog.findMany({ where: { action: "student.create" } });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.resourceId).toBe(student.id);
    expect(logs[0]?.actorId).toBe(fixture.adminId);
  });
});
