import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDatabase, seedFixture, type Fixture } from "../helpers/db";
import { createStudent } from "@/lib/services/student.service";
import { createEnrollment } from "@/lib/services/enrollment.service";
import { createAssessment } from "@/lib/services/assessment.service";
import { bulkUpsertScores, getCourseGradebook, upsertScore } from "@/lib/services/score.service";
import { upsertGradingSet } from "@/lib/services/grading-rule.service";

let fixture: Fixture;
let enrollmentId: string;

const actor = () => ({ userId: fixture.adminId, staffProfileId: fixture.staffId });

beforeEach(async () => {
  await resetDatabase();
  fixture = await seedFixture();
  const student = await createStudent(
    { firstName: "Ada", lastName: "Nwosu", email: "ada@test.edu", departmentId: fixture.departmentId },
    fixture.adminId,
  );
  const enrollment = await createEnrollment(
    {
      studentId: student.student.id,
      courseId: fixture.courseId,
      sessionId: fixture.sessionId,
      semesterId: fixture.semesterId,
    },
    fixture.adminId,
  );
  enrollmentId = enrollment.id;

  await upsertGradingSet(
    {
      setName: "default",
      bands: [
        { grade: "A", minScore: 70, maxScore: 100, points: 5 },
        { grade: "B", minScore: 60, maxScore: 69.999, points: 4 },
        { grade: "F", minScore: 0, maxScore: 59.999, points: 0 },
      ],
    },
    fixture.adminId,
  );
});

async function makeAssessment(maxScore = 20, weight = 100) {
  return createAssessment(
    { courseId: fixture.courseId, type: "ASSIGNMENT", title: "Assignment 1", maxScore, weight },
    fixture.adminId,
    fixture.staffId,
  );
}

describe("score entry and grade calculation", () => {
  it("stores a valid score", async () => {
    const assessment = await makeAssessment();
    const score = await upsertScore(
      { assessmentId: assessment.id, enrollmentId, rawScore: 15 },
      actor(),
    );
    expect(score.rawScore).toBe(15);
  });

  it("rejects a score above the assessment maximum", async () => {
    const assessment = await makeAssessment(20);
    await expect(
      upsertScore({ assessmentId: assessment.id, enrollmentId, rawScore: 21 }, actor()),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("rejects a negative score at the schema boundary", async () => {
    const assessment = await makeAssessment();
    await expect(
      upsertScore({ assessmentId: assessment.id, enrollmentId, rawScore: -1 }, actor()),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("records grade history when an existing score changes", async () => {
    const assessment = await makeAssessment();
    await upsertScore({ assessmentId: assessment.id, enrollmentId, rawScore: 10 }, actor());
    await upsertScore({ assessmentId: assessment.id, enrollmentId, rawScore: 18, reason: "Remark" }, actor());

    const history = await prisma.gradeHistory.findMany();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ oldScore: 10, newScore: 18, reason: "Remark" });
  });

  it("does not create history when the score is unchanged", async () => {
    const assessment = await makeAssessment();
    await upsertScore({ assessmentId: assessment.id, enrollmentId, rawScore: 10 }, actor());
    await upsertScore({ assessmentId: assessment.id, enrollmentId, rawScore: 10 }, actor());
    expect(await prisma.gradeHistory.count()).toBe(0);
  });

  it("computes the weighted total and letter grade", async () => {
    const assignment = await makeAssessment(20, 40);
    await createAssessment(
      { courseId: fixture.courseId, type: "EXAM", title: "Exam", maxScore: 60, weight: 60 },
      fixture.adminId,
      fixture.staffId,
    );

    await upsertScore({ assessmentId: assignment.id, enrollmentId, rawScore: 10 }, actor());
    const exam = await prisma.assessment.findFirstOrThrow({ where: { title: "Exam" } });
    await upsertScore({ assessmentId: exam.id, enrollmentId, rawScore: 60 }, actor());

    const gradebook = await getCourseGradebook(fixture.courseId);
    // (10/20)*40 + (60/60)*60 = 80
    expect(gradebook.rows[0]?.total).toBe(80);
    expect(gradebook.rows[0]?.grade).toBe("A");
  });

  it("caps total assessment weight at 100%", async () => {
    await makeAssessment(20, 100);
    await expect(
      createAssessment(
        { courseId: fixture.courseId, type: "EXAM", title: "Too much", maxScore: 60, weight: 10 },
        fixture.adminId,
      ),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("bulk save skips scores for students not enrolled in the course", async () => {
    const assessment = await makeAssessment();
    const result = await bulkUpsertScores(
      {
        assessmentId: assessment.id,
        scores: [
          { enrollmentId, rawScore: 12 },
          { enrollmentId: "some-other-enrollment", rawScore: 5 },
        ],
      },
      actor(),
    );
    expect(result.saved).toBe(1);
    expect(result.skipped).toHaveLength(1);
  });
});
