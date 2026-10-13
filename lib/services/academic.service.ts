import { prisma } from "@/lib/db";
import { conflict, notFound } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import type { ListQuery } from "@/lib/http/pagination";
import type {
  CreateDepartmentInput,
  CreateFacultyInput,
  CreateProgramInput,
} from "@/lib/validation/academic";

// ---------------------------------------------------------------------------
// Faculties
// ---------------------------------------------------------------------------

export async function listFaculties(query: ListQuery) {
  const where = query.q
    ? { OR: [{ name: { contains: query.q } }, { code: { contains: query.q } }] }
    : {};
  const [items, total] = await prisma.$transaction([
    prisma.faculty.findMany({
      where,
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        createdAt: true,
        _count: { select: { departments: true, students: true } },
      },
    }),
    prisma.faculty.count({ where }),
  ]);
  return { items, total };
}

export async function getFacultyById(id: string) {
  const faculty = await prisma.faculty.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      createdAt: true,
      departments: {
        select: { id: true, name: true, code: true, _count: { select: { programs: true, courses: true } } },
      },
    },
  });
  if (!faculty) throw notFound("Faculty not found");
  return faculty;
}

export async function createFaculty(input: CreateFacultyInput, actorId: string) {
  const exists = await prisma.faculty.findFirst({
    where: { OR: [{ name: input.name }, { code: input.code }] },
    select: { id: true },
  });
  if (exists) throw conflict("A faculty with this name or code already exists");

  const faculty = await prisma.faculty.create({ data: input });
  await recordAudit({ actorId, action: "faculty.create", resource: "Faculty", resourceId: faculty.id });
  return faculty;
}

export async function updateFaculty(id: string, input: Partial<CreateFacultyInput>, actorId: string) {
  const existing = await prisma.faculty.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Faculty not found");
  const faculty = await prisma.faculty.update({ where: { id }, data: input });
  await recordAudit({ actorId, action: "faculty.update", resource: "Faculty", resourceId: id });
  return faculty;
}

export async function deleteFaculty(id: string, actorId: string) {
  const existing = await prisma.faculty.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Faculty not found");
  await prisma.faculty.delete({ where: { id } });
  await recordAudit({ actorId, action: "faculty.delete", resource: "Faculty", resourceId: id });
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export async function listDepartments(query: ListQuery, facultyId?: string) {
  const where = {
    ...(facultyId ? { facultyId } : {}),
    ...(query.q
      ? { OR: [{ name: { contains: query.q } }, { code: { contains: query.q } }] }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.department.findMany({
      where,
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
      select: {
        id: true,
        name: true,
        code: true,
        faculty: { select: { id: true, name: true, code: true } },
        _count: { select: { programs: true, courses: true, students: true, staff: true } },
      },
    }),
    prisma.department.count({ where }),
  ]);
  return { items, total };
}

export async function getDepartmentById(id: string) {
  const department = await prisma.department.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      code: true,
      faculty: { select: { id: true, name: true, code: true } },
      programs: { select: { id: true, name: true, code: true, level: true } },
      _count: { select: { courses: true, students: true, staff: true } },
    },
  });
  if (!department) throw notFound("Department not found");
  return department;
}

export async function createDepartment(input: CreateDepartmentInput, actorId: string) {
  const faculty = await prisma.faculty.findUnique({ where: { id: input.facultyId } });
  if (!faculty) throw notFound("Faculty not found");
  const exists = await prisma.department.findFirst({
    where: { OR: [{ name: input.name }, { code: input.code }] },
    select: { id: true },
  });
  if (exists) throw conflict("A department with this name or code already exists");

  const department = await prisma.department.create({ data: input });
  await recordAudit({
    actorId,
    action: "department.create",
    resource: "Department",
    resourceId: department.id,
  });
  return department;
}

export async function updateDepartment(
  id: string,
  input: Partial<CreateDepartmentInput>,
  actorId: string,
) {
  const existing = await prisma.department.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Department not found");
  const department = await prisma.department.update({ where: { id }, data: input });
  await recordAudit({ actorId, action: "department.update", resource: "Department", resourceId: id });
  return department;
}

export async function deleteDepartment(id: string, actorId: string) {
  const existing = await prisma.department.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Department not found");
  await prisma.department.delete({ where: { id } });
  await recordAudit({ actorId, action: "department.delete", resource: "Department", resourceId: id });
}

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

export async function listPrograms(query: ListQuery, departmentId?: string) {
  const where = {
    ...(departmentId ? { departmentId } : {}),
    ...(query.q
      ? { OR: [{ name: { contains: query.q } }, { code: { contains: query.q } }] }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.program.findMany({
      where,
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
      select: {
        id: true,
        name: true,
        code: true,
        level: true,
        department: {
          select: { id: true, name: true, code: true, faculty: { select: { id: true, code: true } } },
        },
        _count: { select: { students: true } },
      },
    }),
    prisma.program.count({ where }),
  ]);
  return { items, total };
}

export async function getProgramById(id: string) {
  const program = await prisma.program.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      code: true,
      level: true,
      department: { select: { id: true, name: true, code: true } },
      _count: { select: { students: true } },
    },
  });
  if (!program) throw notFound("Program not found");
  return program;
}

export async function createProgram(input: CreateProgramInput, actorId: string) {
  const department = await prisma.department.findUnique({ where: { id: input.departmentId } });
  if (!department) throw notFound("Department not found");
  const exists = await prisma.program.findFirst({
    where: { OR: [{ name: input.name }, { code: input.code }] },
    select: { id: true },
  });
  if (exists) throw conflict("A program with this name or code already exists");

  const program = await prisma.program.create({ data: input });
  await recordAudit({ actorId, action: "program.create", resource: "Program", resourceId: program.id });
  return program;
}

export async function updateProgram(id: string, input: Partial<CreateProgramInput>, actorId: string) {
  const existing = await prisma.program.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Program not found");
  const program = await prisma.program.update({ where: { id }, data: input });
  await recordAudit({ actorId, action: "program.update", resource: "Program", resourceId: id });
  return program;
}

export async function deleteProgram(id: string, actorId: string) {
  const existing = await prisma.program.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Program not found");
  await prisma.program.delete({ where: { id } });
  await recordAudit({ actorId, action: "program.delete", resource: "Program", resourceId: id });
}
