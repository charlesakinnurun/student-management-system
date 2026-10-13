import { prisma } from "@/lib/db";
import { conflict, notFound, unprocessable } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import { computeCourseResult, isValidScore, type GradingBand } from "@/lib/domain/grading";
import { getGradingBands } from "@/lib/services/grading-rule.service";
import type { BulkScoreInput, UpsertScoreInput } from "@/lib/validation/score";

export interface Actor {
  userId: string;
  staffProfileId: string | null;
}

/**
 * Upsert a single score, validating against the assessment's maximum and
 * appending to GradeHistory whenever an existing value changes.
 */
export async function upsertScore(input: UpsertScoreInput, actor: Actor) {
  const [assessment, enrollment] = await Promise.all([
    prisma.assessment.findUnique({
      where: { id: input.assessmentId },
      select: { id: true, maxScore: true, courseId: true, isPublished: true, title: true },
    }),
    prisma.enrollment.findUnique({
      where: { id: input.enrollmentId },
      select: { id: true, courseId: true },
    }),
  ]);

  if (!assessment) throw notFound("Assessment not found");
  if (!enrollment) throw notFound("Enrollment not found");
  if (enrollment.courseId !== assessment.courseId) {
    throw unprocessable("The student is not enrolled in the assessment's course");
  }
  if (!isValidScore(input.rawScore, assessment.maxScore)) {
    throw unprocessable(`Score must be between 0 and ${assessment.maxScore}`);
  }

  const existing = await prisma.score.findUnique({
    where: { assessmentId_enrollmentId: { assessmentId: input.assessmentId, enrollmentId: input.enrollmentId } },
    select: { id: true, rawScore: true },
  });

  if (existing && existing.rawScore === input.rawScore) {
    return prisma.score.findUniqueOrThrow({ where: { id: existing.id } });
  }

  const score = await prisma.$transaction(async (tx) => {
    if (existing) {
      const updated = await tx.score.update({
        where: { id: existing.id },
        data: { rawScore: input.rawScore, enteredById: actor.staffProfileId },
      });
      await tx.gradeHistory.create({
        data: {
          scoreId: existing.id,
          oldScore: existing.rawScore,
          newScore: input.rawScore,
          changedBy: actor.userId,
          reason: input.reason ?? "Score updated",
        },
      });
      return updated;
    }
    return tx.score.create({
      data: {
        assessmentId: input.assessmentId,
        enrollmentId: input.enrollmentId,
        rawScore: input.rawScore,
        enteredById: actor.staffProfileId,
      },
    });
  });

  await recordAudit({
    actorId: actor.userId,
    action: existing ? "grade.change" : "grade.create",
    resource: "Score",
    resourceId: score.id,
    metadata: {
      assessmentId: input.assessmentId,
      enrollmentId: input.enrollmentId,
      oldScore: existing?.rawScore ?? null,
      newScore: input.rawScore,
    },
  });

  return score;
}

export interface BulkScoreResult {
  saved: number;
  skipped: Array<{ enrollmentId: string; reason: string }>;
}

export async function bulkUpsertScores(input: BulkScoreInput, actor: Actor): Promise<BulkScoreResult> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: input.assessmentId },
    select: { id: true, maxScore: true, courseId: true },
  });
  if (!assessment) throw notFound("Assessment not found");

  const courseEnrollments = await prisma.enrollment.findMany({
    where: { courseId: assessment.courseId },
    select: { id: true },
  });
  const validEnrollmentIds = new Set(courseEnrollments.map((e) => e.id));

  const result: BulkScoreResult = { saved: 0, skipped: [] };

  for (const entry of input.scores) {
    if (!validEnrollmentIds.has(entry.enrollmentId)) {
      result.skipped.push({ enrollmentId: entry.enrollmentId, reason: "Not enrolled in course" });
      continue;
    }
    if (!isValidScore(entry.rawScore, assessment.maxScore)) {
      result.skipped.push({
        enrollmentId: entry.enrollmentId,
        reason: `Score must be between 0 and ${assessment.maxScore}`,
      });
      continue;
    }
    try {
      await upsertScore({ assessmentId: input.assessmentId, enrollmentId: entry.enrollmentId, rawScore: entry.rawScore }, actor);
      result.saved += 1;
    } catch (error) {
      result.skipped.push({
        enrollmentId: entry.enrollmentId,
        reason: error instanceof Error ? error.message : "Failed",
      });
    }
  }

  await recordAudit({
    actorId: actor.userId,
    action: "grade.bulk_update",
    resource: "Assessment",
    resourceId: input.assessmentId,
    metadata: { saved: result.saved, skipped: result.skipped.length },
  });
  return result;
}

export async function deleteScore(id: string, actor: Actor) {
  const existing = await prisma.score.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Score not found");
  await prisma.score.delete({ where: { id } });
  await recordAudit({ actorId: actor.userId, action: "grade.delete", resource: "Score", resourceId: id });
}

/** Roster + entered scores for a single assessment (score-entry screen). */
export async function getAssessmentScores(assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      title: true,
      type: true,
      maxScore: true,
      weight: true,
      isPublished: true,
      course: { select: { id: true, code: true, title: true } },
    },
  });
  if (!assessment) throw notFound("Assessment not found");

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: assessment.course.id, status: "ACTIVE" },
    select: {
      id: true,
      student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
      scores: { where: { assessmentId }, select: { id: true, rawScore: true } },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  return {
    assessment,
    rows: enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      student: enrollment.student,
      scoreId: enrollment.scores[0]?.id ?? null,
      rawScore: enrollment.scores[0]?.rawScore ?? null,
    })),
  };
}

export interface GradebookRow {
  enrollmentId: string;
  student: { id: string; studentId: string; firstName: string; lastName: string };
  scores: Record<string, number>;
  total: number;
  gradedWeight: number;
  isComplete: boolean;
  grade: string | null;
  points: number | null;
}

/** Full computed gradebook for a course, using configurable bands. */
export async function getCourseGradebook(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      code: true,
      title: true,
      creditUnits: true,
      semester: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });
  if (!course) throw notFound("Course not found");

  const [assessments, enrollments, bands] = await Promise.all([
    prisma.assessment.findMany({
      where: { courseId },
      select: { id: true, type: true, title: true, maxScore: true, weight: true, isPublished: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.enrollment.findMany({
      where: { courseId, status: "ACTIVE" },
      select: {
        id: true,
        student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
        scores: { select: { assessmentId: true, rawScore: true } },
      },
    }),
    getGradingBands(),
  ]);

  const weightSum = assessments.reduce((sum, a) => sum + a.weight, 0);

  const rows: GradebookRow[] = enrollments
    .map((enrollment) => {
      const scoreMap = Object.fromEntries(enrollment.scores.map((s) => [s.assessmentId, s.rawScore]));
      const result = computeCourseResult(
        assessments.map((a) => ({ id: a.id, maxScore: a.maxScore, weight: a.weight })),
        enrollment.scores.map((s) => ({ assessmentId: s.assessmentId, rawScore: s.rawScore })),
        bands,
      );
      return {
        enrollmentId: enrollment.id,
        student: enrollment.student,
        scores: scoreMap,
        total: result.total,
        gradedWeight: result.gradedWeight,
        isComplete: result.isComplete,
        grade: result.grade,
        points: result.points,
      };
    })
    .sort((a, b) => b.total - a.total);

  return { course, assessments, rows, weightSum };
}

export interface StudentCourseResult {
  enrollmentId: string;
  course: { id: string; code: string; title: string; creditUnits: number };
  session: { id: string; name: string };
  semester: { id: string; name: string };
  total: number;
  gradedWeight: number;
  isComplete: boolean;
  grade: string | null;
  points: number | null;
  /** True only when every assessment for the course is published. */
  published: boolean;
}

/** All computed results for a student, grouped per session/semester with GPA. */
export async function getStudentResults(studentId: string, sessionId?: string) {
  const [enrollments, bands] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId, ...(sessionId ? { sessionId } : {}), status: { in: ["ACTIVE", "COMPLETED"] } },
      select: {
        id: true,
        session: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true } },
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            creditUnits: true,
            assessments: { select: { id: true, maxScore: true, weight: true, isPublished: true } },
          },
        },
        scores: { select: { assessmentId: true, rawScore: true } },
      },
    }),
    getGradingBands(),
  ]);

  const results: StudentCourseResult[] = enrollments.map((enrollment) => {
    const result = computeCourseResult(
      enrollment.course.assessments.map((a) => ({ id: a.id, maxScore: a.maxScore, weight: a.weight })),
      enrollment.scores.map((s) => ({ assessmentId: s.assessmentId, rawScore: s.rawScore })),
      bands,
    );
    const assessmentsWithScores = new Set(enrollment.scores.map((s) => s.assessmentId));
    const published =
      enrollment.course.assessments.length > 0 &&
      enrollment.course.assessments
        .filter((a) => assessmentsWithScores.has(a.id))
        .every((a) => a.isPublished);

    return {
      enrollmentId: enrollment.id,
      course: {
        id: enrollment.course.id,
        code: enrollment.course.code,
        title: enrollment.course.title,
        creditUnits: enrollment.course.creditUnits,
      },
      session: enrollment.session,
      semester: enrollment.semester,
      total: result.total,
      gradedWeight: result.gradedWeight,
      isComplete: result.isComplete,
      grade: result.grade,
      points: result.points,
      published,
    };
  });

  // Group by term and compute credit-weighted GPA per group.
  const groups = new Map<
    string,
    { session: { id: string; name: string }; semester: { id: string; name: string }; results: StudentCourseResult[] }
  >();
  for (const result of results) {
    const key = `${result.session.id}:${result.semester.id}`;
    const group = groups.get(key) ?? { session: result.session, semester: result.semester, results: [] };
    group.results.push(result);
    groups.set(key, group);
  }

  const terms = [...groups.values()].map((group) => {
    const gradedRows = group.results.map((r) => ({
      points: r.published ? r.points : null,
      creditUnits: r.course.creditUnits,
    }));
    const graded = gradedRows.filter((r) => r.points !== null);
    const credits = graded.reduce((sum, r) => sum + r.creditUnits, 0);
    const gpa =
      credits > 0
        ? Math.round((graded.reduce((sum, r) => sum + (r.points as number) * r.creditUnits, 0) / credits) * 100) /
          100
        : null;
    return { ...group, gpa, totalCredits: credits };
  });

  return { terms, results };
}

/** Result for one enrolment (used by the student course page). */
export async function getEnrollmentResult(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          creditUnits: true,
          assessments: {
            select: { id: true, title: true, type: true, maxScore: true, weight: true, isPublished: true },
          },
        },
      },
      scores: { select: { assessmentId: true, rawScore: true } },
    },
  });
  if (!enrollment) throw notFound("Enrollment not found");

  const bands = await getGradingBands();
  const result = computeCourseResult(
    enrollment.course.assessments.map((a) => ({ id: a.id, maxScore: a.maxScore, weight: a.weight })),
    enrollment.scores.map((s) => ({ assessmentId: s.assessmentId, rawScore: s.rawScore })),
    bands,
  );

  const scoreMap = Object.fromEntries(enrollment.scores.map((s) => [s.assessmentId, s.rawScore]));
  return {
    enrollmentId: enrollment.id,
    course: enrollment.course,
    result,
    scores: scoreMap,
  };
}

/** Guard used by routes to disambiguate conflicting score entries. */
export function assertDistinctEnrollments(input: BulkScoreInput): void {
  const ids = input.scores.map((s) => s.enrollmentId);
  if (new Set(ids).size !== ids.length) {
    throw conflict("Duplicate enrollment entries in the submitted scores");
  }
}
