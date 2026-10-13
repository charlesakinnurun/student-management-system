import { prisma } from "@/lib/db";
import { conflict, notFound, unprocessable } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import type { ListQuery } from "@/lib/http/pagination";
import type { CreateSemesterInput, CreateSessionInput } from "@/lib/validation/session";

// ---------------------------------------------------------------------------
// Academic sessions
// ---------------------------------------------------------------------------

export async function listAcademicSessions(query: ListQuery) {
  const where = query.q ? { name: { contains: query.q } } : {};
  const [items, total] = await prisma.$transaction([
    prisma.academicSession.findMany({
      where,
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
        _count: { select: { semesters: true, enrollments: true, fees: true } },
      },
    }),
    prisma.academicSession.count({ where }),
  ]);
  return { items, total };
}

export async function getAcademicSessionById(id: string) {
  const session = await prisma.academicSession.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
      semesters: {
        select: { id: true, name: true, startDate: true, endDate: true, isCurrent: true },
        orderBy: { startDate: "asc" },
      },
      _count: { select: { enrollments: true, fees: true, assignments: true } },
    },
  });
  if (!session) throw notFound("Academic session not found");
  return session;
}

/** The session flagged current, used to default dashboards and forms. */
export async function getCurrentSession() {
  return prisma.academicSession.findFirst({ where: { isCurrent: true } });
}

export async function createAcademicSession(input: CreateSessionInput, actorId: string) {
  const exists = await prisma.academicSession.findUnique({
    where: { name: input.name },
    select: { id: true },
  });
  if (exists) throw conflict("A session with this name already exists");

  const session = await prisma.$transaction(async (tx) => {
    if (input.isCurrent) {
      await tx.academicSession.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    }
    return tx.academicSession.create({
      data: {
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        isCurrent: input.isCurrent ?? false,
      },
    });
  });

  await recordAudit({
    actorId,
    action: "session.create",
    resource: "AcademicSession",
    resourceId: session.id,
    metadata: { name: session.name },
  });
  return session;
}

export async function updateAcademicSession(
  id: string,
  input: Partial<CreateSessionInput>,
  actorId: string,
) {
  const existing = await prisma.academicSession.findUnique({ where: { id } });
  if (!existing) throw notFound("Academic session not found");

  if (input.name && input.name !== existing.name) {
    const taken = await prisma.academicSession.findUnique({ where: { name: input.name } });
    if (taken) throw conflict("A session with this name already exists");
  }
  const startDate = input.startDate ?? existing.startDate;
  const endDate = input.endDate ?? existing.endDate;
  if (endDate <= startDate) throw unprocessable("End date must be after the start date");

  const session = await prisma.$transaction(async (tx) => {
    if (input.isCurrent) {
      await tx.academicSession.updateMany({
        where: { isCurrent: true, NOT: { id } },
        data: { isCurrent: false },
      });
    }
    return tx.academicSession.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        startDate,
        endDate,
        ...(input.isCurrent !== undefined ? { isCurrent: input.isCurrent } : {}),
      },
    });
  });

  await recordAudit({ actorId, action: "session.update", resource: "AcademicSession", resourceId: id });
  return session;
}

export async function deleteAcademicSession(id: string, actorId: string) {
  const existing = await prisma.academicSession.findUnique({
    where: { id },
    select: { id: true, _count: { select: { enrollments: true, fees: true } } },
  });
  if (!existing) throw notFound("Academic session not found");
  if (existing._count.enrollments > 0 || existing._count.fees > 0) {
    throw conflict("This session has enrolments or fees and cannot be deleted");
  }
  await prisma.academicSession.delete({ where: { id } }); // cascades to semesters
  await recordAudit({ actorId, action: "session.delete", resource: "AcademicSession", resourceId: id });
}

// ---------------------------------------------------------------------------
// Semesters / terms
// ---------------------------------------------------------------------------

export async function listSemesters(query: ListQuery, sessionId?: string) {
  const where = {
    ...(sessionId ? { sessionId } : {}),
    ...(query.q ? { name: { contains: query.q } } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.semester.findMany({
      where,
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
        session: { select: { id: true, name: true } },
        _count: { select: { courses: true, enrollments: true } },
      },
    }),
    prisma.semester.count({ where }),
  ]);
  return { items, total };
}

export async function getSemesterById(id: string) {
  const semester = await prisma.semester.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
      session: { select: { id: true, name: true } },
      _count: { select: { courses: true, enrollments: true } },
    },
  });
  if (!semester) throw notFound("Semester not found");
  return semester;
}

export async function getCurrentSemester() {
  return prisma.semester.findFirst({ where: { isCurrent: true }, include: { session: true } });
}

export async function createSemester(input: CreateSemesterInput, actorId: string) {
  const session = await prisma.academicSession.findUnique({ where: { id: input.sessionId } });
  if (!session) throw notFound("Academic session not found");

  const duplicate = await prisma.semester.findFirst({
    where: { sessionId: input.sessionId, name: input.name },
    select: { id: true },
  });
  if (duplicate) throw conflict("This session already has a semester with that name");

  const semester = await prisma.$transaction(async (tx) => {
    if (input.isCurrent) {
      await tx.semester.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    }
    return tx.semester.create({
      data: {
        name: input.name,
        sessionId: input.sessionId,
        startDate: input.startDate,
        endDate: input.endDate,
        isCurrent: input.isCurrent ?? false,
      },
    });
  });

  await recordAudit({
    actorId,
    action: "semester.create",
    resource: "Semester",
    resourceId: semester.id,
  });
  return semester;
}

export async function updateSemester(id: string, input: Partial<CreateSemesterInput>, actorId: string) {
  const existing = await prisma.semester.findUnique({ where: { id } });
  if (!existing) throw notFound("Semester not found");

  const startDate = input.startDate ?? existing.startDate;
  const endDate = input.endDate ?? existing.endDate;
  if (endDate <= startDate) throw unprocessable("End date must be after the start date");

  const semester = await prisma.$transaction(async (tx) => {
    if (input.isCurrent) {
      await tx.semester.updateMany({ where: { isCurrent: true, NOT: { id } }, data: { isCurrent: false } });
    }
    return tx.semester.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        startDate,
        endDate,
        ...(input.isCurrent !== undefined ? { isCurrent: input.isCurrent } : {}),
      },
    });
  });

  await recordAudit({ actorId, action: "semester.update", resource: "Semester", resourceId: id });
  return semester;
}

export async function deleteSemester(id: string, actorId: string) {
  const existing = await prisma.semester.findUnique({
    where: { id },
    select: { id: true, _count: { select: { enrollments: true } } },
  });
  if (!existing) throw notFound("Semester not found");
  if (existing._count.enrollments > 0) {
    throw conflict("This semester has enrolments and cannot be deleted");
  }
  await prisma.semester.delete({ where: { id } });
  await recordAudit({ actorId, action: "semester.delete", resource: "Semester", resourceId: id });
}
