import { prisma } from "@/lib/db";
import { badRequest, conflict, notFound, unprocessable } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import type { ListQuery } from "@/lib/http/pagination";
import { generateTemporaryPassword, nextStudentId } from "@/lib/services/ids";
import type { CreateStudentInput, UpdateStudentInput } from "@/lib/validation/student";

export const studentSelect = {
  id: true,
  studentId: true,
  firstName: true,
  lastName: true,
  phone: true,
  dateOfBirth: true,
  gender: true,
  address: true,
  photoUrl: true,
  level: true,
  status: true,
  admissionDate: true,
  emergencyContact: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, email: true, status: true, role: true } },
  faculty: { select: { id: true, name: true, code: true } },
  department: { select: { id: true, name: true, code: true } },
  program: { select: { id: true, name: true, code: true } },
} as const;

export interface StudentFilters {
  departmentId?: string;
  facultyId?: string;
  level?: string;
  status?: string;
}

export async function listStudents(query: ListQuery, filters: StudentFilters) {
  const where = {
    ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    ...(filters.facultyId ? { facultyId: filters.facultyId } : {}),
    ...(filters.level ? { level: filters.level } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(query.q
      ? {
          OR: [
            { firstName: { contains: query.q } },
            { lastName: { contains: query.q } },
            { studentId: { contains: query.q } },
            { user: { email: { contains: query.q } } },
          ],
        }
      : {}),
  };

  // Single round-trip for page + count via a transaction (avoids N+1).
  const [items, total] = await prisma.$transaction([
    prisma.studentProfile.findMany({
      where,
      select: studentSelect,
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
    }),
    prisma.studentProfile.count({ where }),
  ]);

  return { items, total };
}

export async function getStudentById(id: string) {
  const student = await prisma.studentProfile.findUnique({
    where: { id },
    select: studentSelect,
  });
  if (!student) throw notFound("Student not found");
  return student;
}

/** Full 360 view used by the student profile page. */
export async function getStudentDetail(id: string) {
  const student = await prisma.studentProfile.findUnique({
    where: { id },
    select: {
      ...studentSelect,
      enrollments: {
        select: {
          id: true,
          status: true,
          enrolledAt: true,
          course: { select: { id: true, code: true, title: true, creditUnits: true } },
          session: { select: { id: true, name: true } },
          semester: { select: { id: true, name: true } },
        },
        orderBy: { enrolledAt: "desc" },
      },
      fees: {
        select: {
          id: true,
          amountDue: true,
          amountPaid: true,
          status: true,
          dueDate: true,
          session: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!student) throw notFound("Student not found");
  return student;
}

async function assertReferencesExist(input: {
  facultyId?: string;
  departmentId?: string;
  programId?: string;
  sessionId?: string;
}) {
  const checks: Array<Promise<unknown>> = [];
  if (input.facultyId) checks.push(prisma.faculty.findUnique({ where: { id: input.facultyId } }));
  if (input.departmentId)
    checks.push(prisma.department.findUnique({ where: { id: input.departmentId } }));
  if (input.programId) checks.push(prisma.program.findUnique({ where: { id: input.programId } }));
  if (input.sessionId)
    checks.push(prisma.academicSession.findUnique({ where: { id: input.sessionId } }));

  const results = await Promise.all(checks);
  if (results.some((r) => !r)) throw unprocessable("One or more selected references do not exist");
}

export interface CreateStudentResult {
  student: Awaited<ReturnType<typeof getStudentById>>;
  /** Present only when the service generated the password (not caller-supplied). */
  temporaryPassword?: string;
}

export async function createStudent(
  input: CreateStudentInput,
  actorId: string,
): Promise<CreateStudentResult> {
  await assertReferencesExist(input);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("A user with this email already exists");

  const studentId = input.studentId ?? (await nextStudentId());
  const password = input.password ?? generateTemporaryPassword();
  const passwordHash = await hashPassword(password);

  const created = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
      createdBy: actorId,
      studentProfile: {
        create: {
          studentId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          address: input.address,
          photoUrl: input.photoUrl,
          facultyId: input.facultyId,
          departmentId: input.departmentId,
          programId: input.programId,
          level: input.level,
          sessionId: input.sessionId,
          admissionDate: input.admissionDate ?? new Date(),
          status: input.status ?? "ACTIVE",
          emergencyContact: input.emergencyContact,
          createdBy: actorId,
        },
      },
    },
    select: { studentProfile: { select: { id: true } } },
  });

  const student = await getStudentById(created.studentProfile!.id);

  await recordAudit({
    actorId,
    action: "student.create",
    resource: "StudentProfile",
    resourceId: student.id,
    metadata: { studentId: student.studentId, email: input.email },
  });

  return { student, temporaryPassword: input.password ? undefined : password };
}

export async function updateStudent(
  id: string,
  input: UpdateStudentInput,
  actorId: string,
): Promise<Awaited<ReturnType<typeof getStudentById>>> {
  const existing = await prisma.studentProfile.findUnique({
    where: { id },
    select: { id: true, userId: true, studentId: true },
  });
  if (!existing) throw notFound("Student not found");

  await assertReferencesExist(input);

  if (input.email) {
    const emailTaken = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id: existing.userId } },
      select: { id: true },
    });
    if (emailTaken) throw conflict("A user with this email already exists");
  }

  const { email, studentId, ...profile } = input;
  if (studentId) throw badRequest("Student ID cannot be changed");

  await prisma.$transaction([
    prisma.studentProfile.update({
      where: { id },
      data: { ...profile, updatedBy: actorId },
    }),
    ...(email
      ? [
          prisma.user.update({
            where: { id: existing.userId },
            data: { email, updatedBy: actorId },
          }),
        ]
      : []),
  ]);

  const student = await getStudentById(id);
  await recordAudit({
    actorId,
    action: "student.update",
    resource: "StudentProfile",
    resourceId: id,
    metadata: { fields: Object.keys(input) },
  });
  return student;
}

export async function deleteStudent(id: string, actorId: string): Promise<void> {
  const existing = await prisma.studentProfile.findUnique({
    where: { id },
    select: { id: true, userId: true, studentId: true },
  });
  if (!existing) throw notFound("Student not found");

  // Deleting the user cascades to the profile and its dependents (schema-defined).
  await prisma.user.delete({ where: { id: existing.userId } });

  await recordAudit({
    actorId,
    action: "student.delete",
    resource: "StudentProfile",
    resourceId: id,
    metadata: { studentId: existing.studentId },
  });
}

/** Resolve the student profile owned by the authenticated user. */
export async function getStudentByUserId(userId: string) {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
    select: studentSelect,
  });
  if (!student) throw notFound("Student profile not found");
  return student;
}
