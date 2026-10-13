import { prisma } from "@/lib/db";
import { conflict, notFound, unprocessable } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import type { ListQuery } from "@/lib/http/pagination";
import type { CreateCourseInput, UpdateCourseInput } from "@/lib/validation/course";

export const courseSelect = {
  id: true,
  code: true,
  title: true,
  description: true,
  creditUnits: true,
  level: true,
  venue: true,
  scheduleDays: true,
  startTime: true,
  endTime: true,
  createdAt: true,
  department: {
    select: { id: true, name: true, code: true, faculty: { select: { id: true, code: true } } },
  },
  semester: { select: { id: true, name: true, session: { select: { id: true, name: true } } } },
  _count: { select: { enrollments: true, assessments: true } },
} as const;

export interface CourseFilters {
  departmentId?: string;
  level?: string;
  semesterId?: string;
  sessionId?: string;
  lecturerId?: string;
}

export async function listCourses(query: ListQuery, filters: CourseFilters) {
  const where = {
    ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    ...(filters.level ? { level: filters.level } : {}),
    ...(filters.semesterId ? { semesterId: filters.semesterId } : {}),
    ...(filters.lecturerId
      ? {
          assignments: {
            some: {
              staffId: filters.lecturerId,
              ...(filters.sessionId ? { sessionId: filters.sessionId } : {}),
            },
          },
        }
      : {}),
    ...(query.q
      ? { OR: [{ title: { contains: query.q } }, { code: { contains: query.q } }] }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.course.findMany({
      where,
      select: {
        ...courseSelect,
        assignments: {
          select: {
            id: true,
            staff: { select: { id: true, firstName: true, lastName: true, staffId: true } },
            session: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
    }),
    prisma.course.count({ where }),
  ]);

  return { items, total };
}

export async function getCourseById(id: string) {
  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      ...courseSelect,
      assignments: {
        select: {
          id: true,
          session: { select: { id: true, name: true } },
          staff: {
            select: {
              id: true,
              staffId: true,
              firstName: true,
              lastName: true,
              user: { select: { email: true } },
            },
          },
        },
      },
      assessments: {
        select: {
          id: true,
          type: true,
          title: true,
          maxScore: true,
          weight: true,
          dueDate: true,
          isPublished: true,
          _count: { select: { scores: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!course) throw notFound("Course not found");
  return course;
}

export async function createCourse(input: CreateCourseInput, actorId: string) {
  const department = await prisma.department.findUnique({ where: { id: input.departmentId } });
  if (!department) throw notFound("Department not found");

  if (input.semesterId) {
    const semester = await prisma.semester.findUnique({ where: { id: input.semesterId } });
    if (!semester) throw unprocessable("Selected semester does not exist");
  }
  if (input.lecturerId && !input.sessionId) {
    throw unprocessable("A session is required to assign a lecturer");
  }

  const existing = await prisma.course.findFirst({
    where: { code: input.code, semesterId: input.semesterId ?? null },
    select: { id: true },
  });
  if (existing) throw conflict("A course with this code already exists for the selected semester");

  const course = await prisma.course.create({
    data: {
      code: input.code,
      title: input.title,
      description: input.description,
      creditUnits: input.creditUnits,
      departmentId: input.departmentId,
      level: input.level,
      venue: input.venue,
      scheduleDays: input.scheduleDays,
      startTime: input.startTime,
      endTime: input.endTime,
      semesterId: input.semesterId,
      ...(input.lecturerId && input.sessionId
        ? {
            assignments: {
              create: { staffId: input.lecturerId, sessionId: input.sessionId },
            },
          }
        : {}),
    },
  });

  await recordAudit({
    actorId,
    action: "course.create",
    resource: "Course",
    resourceId: course.id,
    metadata: { code: course.code },
  });
  return getCourseById(course.id);
}

export async function updateCourse(id: string, input: UpdateCourseInput, actorId: string) {
  const existing = await prisma.course.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Course not found");

  const { lecturerId, sessionId, ...data } = input;
  const course = await prisma.course.update({ where: { id }, data });
  await recordAudit({ actorId, action: "course.update", resource: "Course", resourceId: id });
  return course;
}

export async function deleteCourse(id: string, actorId: string) {
  const existing = await prisma.course.findUnique({
    where: { id },
    select: { id: true, _count: { select: { enrollments: true } } },
  });
  if (!existing) throw notFound("Course not found");
  if (existing._count.enrollments > 0) {
    throw conflict("This course has enrolled students and cannot be deleted");
  }
  await prisma.course.delete({ where: { id } });
  await recordAudit({ actorId, action: "course.delete", resource: "Course", resourceId: id });
}

// ---------------------------------------------------------------------------
// Lecturer assignments
// ---------------------------------------------------------------------------

export async function assignLecturer(
  courseId: string,
  staffId: string,
  sessionId: string,
  actorId: string,
) {
  const [course, staff, session] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }),
    prisma.staffProfile.findUnique({ where: { id: staffId }, select: { id: true } }),
    prisma.academicSession.findUnique({ where: { id: sessionId }, select: { id: true } }),
  ]);
  if (!course) throw notFound("Course not found");
  if (!staff) throw notFound("Staff member not found");
  if (!session) throw notFound("Academic session not found");

  const duplicate = await prisma.courseAssignment.findFirst({
    where: { courseId, staffId, sessionId },
    select: { id: true },
  });
  if (duplicate) throw conflict("This lecturer is already assigned to the course for this session");

  const assignment = await prisma.courseAssignment.create({ data: { courseId, staffId, sessionId } });
  await recordAudit({
    actorId,
    action: "course.assign_lecturer",
    resource: "CourseAssignment",
    resourceId: assignment.id,
    metadata: { courseId, staffId, sessionId },
  });
  return assignment;
}

export async function unassignLecturer(assignmentId: string, actorId: string) {
  const assignment = await prisma.courseAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, courseId: true, staffId: true },
  });
  if (!assignment) throw notFound("Assignment not found");
  await prisma.courseAssignment.delete({ where: { id: assignmentId } });
  await recordAudit({
    actorId,
    action: "course.unassign_lecturer",
    resource: "CourseAssignment",
    resourceId: assignmentId,
    metadata: { courseId: assignment.courseId, staffId: assignment.staffId },
  });
}

/** Courses taught by a lecturer, with student counts — used by the lecturer UI. */
export async function listLecturerCourses(staffId: string, sessionId?: string) {
  return prisma.course.findMany({
    where: {
      assignments: { some: { staffId, ...(sessionId ? { sessionId } : {}) } },
    },
    select: {
      id: true,
      code: true,
      title: true,
      level: true,
      creditUnits: true,
      department: { select: { id: true, name: true, code: true } },
      semester: { select: { id: true, name: true } },
      _count: { select: { enrollments: true, assessments: true } },
    },
    orderBy: { code: "asc" },
  });
}
