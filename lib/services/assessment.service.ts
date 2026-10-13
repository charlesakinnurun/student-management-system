import { prisma } from "@/lib/db";
import { notFound, unprocessable } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import type { ListQuery } from "@/lib/http/pagination";
import type { CreateAssessmentInput, UpdateAssessmentInput } from "@/lib/validation/assessment";

export const assessmentSelect = {
  id: true,
  type: true,
  title: true,
  maxScore: true,
  weight: true,
  dueDate: true,
  isPublished: true,
  createdAt: true,
  course: { select: { id: true, code: true, title: true } },
  _count: { select: { scores: true } },
} as const;

export interface AssessmentFilters {
  courseId?: string;
  type?: string;
  isPublished?: boolean;
  /** Restrict to assessments belonging to courses taught by this staff member. */
  lecturerId?: string;
}

export async function listAssessments(query: ListQuery, filters: AssessmentFilters) {
  const where = {
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.isPublished !== undefined ? { isPublished: filters.isPublished } : {}),
    ...(filters.lecturerId
      ? { course: { assignments: { some: { staffId: filters.lecturerId } } } }
      : {}),
    ...(query.q ? { title: { contains: query.q } } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.assessment.findMany({
      where,
      select: assessmentSelect,
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
    }),
    prisma.assessment.count({ where }),
  ]);
  return { items, total };
}

export async function getAssessmentById(id: string) {
  const assessment = await prisma.assessment.findUnique({ where: { id }, select: assessmentSelect });
  if (!assessment) throw notFound("Assessment not found");
  return assessment;
}

/** Course assessments must not exceed 100% total weight. */
async function assertWeightFits(courseId: string, weight: number, excludeId?: string) {
  const aggregate = await prisma.assessment.aggregate({
    where: { courseId, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    _sum: { weight: true },
  });
  const current = aggregate._sum.weight ?? 0;
  if (current + weight > 100) {
    throw unprocessable(
      `Total assessment weight for this course would exceed 100% (currently ${current}%)`,
    );
  }
}

export async function createAssessment(
  input: CreateAssessmentInput,
  actorId: string,
  staffId?: string | null,
) {
  const course = await prisma.course.findUnique({ where: { id: input.courseId }, select: { id: true } });
  if (!course) throw notFound("Course not found");
  await assertWeightFits(input.courseId, input.weight);

  const assessment = await prisma.assessment.create({
    data: {
      courseId: input.courseId,
      type: input.type,
      title: input.title,
      maxScore: input.maxScore,
      weight: input.weight,
      dueDate: input.dueDate,
      isPublished: input.isPublished ?? false,
      createdBy: actorId,
    },
    select: assessmentSelect,
  });

  await recordAudit({
    actorId,
    action: "assessment.create",
    resource: "Assessment",
    resourceId: assessment.id,
    metadata: { courseId: input.courseId, type: input.type, staffId },
  });
  return assessment;
}

export async function updateAssessment(id: string, input: UpdateAssessmentInput, actorId: string) {
  const existing = await prisma.assessment.findUnique({
    where: { id },
    select: { id: true, courseId: true },
  });
  if (!existing) throw notFound("Assessment not found");

  if (input.maxScore !== undefined) {
    const highest = await prisma.score.aggregate({
      where: { assessmentId: id },
      _max: { rawScore: true },
    });
    const max = highest._max.rawScore ?? 0;
    if (max > input.maxScore) {
      throw unprocessable(
        `Cannot lower the maximum score below an existing score (${max})`,
      );
    }
  }
  if (input.weight !== undefined) {
    await assertWeightFits(existing.courseId, input.weight, id);
  }

  const assessment = await prisma.assessment.update({
    where: { id },
    data: input,
    select: assessmentSelect,
  });
  await recordAudit({ actorId, action: "assessment.update", resource: "Assessment", resourceId: id });
  return assessment;
}

export async function setAssessmentPublished(id: string, isPublished: boolean, actorId: string) {
  const existing = await prisma.assessment.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Assessment not found");
  const assessment = await prisma.assessment.update({
    where: { id },
    data: { isPublished },
    select: assessmentSelect,
  });
  await recordAudit({
    actorId,
    action: isPublished ? "assessment.publish" : "assessment.unpublish",
    resource: "Assessment",
    resourceId: id,
  });
  return assessment;
}

export async function deleteAssessment(id: string, actorId: string) {
  const existing = await prisma.assessment.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Assessment not found");
  await prisma.assessment.delete({ where: { id } });
  await recordAudit({ actorId, action: "assessment.delete", resource: "Assessment", resourceId: id });
}
