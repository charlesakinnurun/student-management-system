import { describe, expect, it } from "vitest";
import {
  computeAttendance,
  computeCourseResult,
  computeGpa,
  isValidScore,
  resolveBand,
  type GradingBand,
} from "@/lib/domain/grading";

const BANDS: GradingBand[] = [
  { minScore: 70, maxScore: 100, grade: "A", points: 5 },
  { minScore: 60, maxScore: 69.999, grade: "B", points: 4 },
  { minScore: 50, maxScore: 59.999, grade: "C", points: 3 },
  { minScore: 0, maxScore: 49.999, grade: "F", points: 0 },
];

const ASSESSMENTS = [
  { id: "a", maxScore: 20, weight: 20 },
  { id: "b", maxScore: 30, weight: 20 },
  { id: "c", maxScore: 70, weight: 60 },
];

describe("computeCourseResult", () => {
  it("computes a weighted percentage and resolves the grade when complete", () => {
    const result = computeCourseResult(
      ASSESSMENTS,
      [
        { assessmentId: "a", rawScore: 20 },
        { assessmentId: "b", rawScore: 30 },
        { assessmentId: "c", rawScore: 70 },
      ],
      BANDS,
    );
    expect(result.total).toBe(100);
    expect(result.gradedWeight).toBe(100);
    expect(result.isComplete).toBe(true);
    expect(result.grade).toBe("A");
    expect(result.points).toBe(5);
  });

  it("treats missing scores as zero and marks the result incomplete", () => {
    const result = computeCourseResult(ASSESSMENTS, [{ assessmentId: "a", rawScore: 10 }], BANDS);
    expect(result.total).toBe(10);
    expect(result.gradedWeight).toBe(20);
    expect(result.isComplete).toBe(false);
    expect(result.grade).toBe("F");
  });

  it("returns no grade when no scores exist", () => {
    const result = computeCourseResult(ASSESSMENTS, [], BANDS);
    expect(result.total).toBe(0);
    expect(result.grade).toBeNull();
    expect(result.isComplete).toBe(false);
  });

  it("rounds the total to two decimals", () => {
    const result = computeCourseResult(
      [{ id: "x", maxScore: 3, weight: 100 }],
      [{ assessmentId: "x", rawScore: 1 }],
      BANDS,
    );
    expect(result.total).toBe(33.33);
  });
});

describe("resolveBand", () => {
  it("matches inclusive boundaries", () => {
    expect(resolveBand(70, BANDS)?.grade).toBe("A");
    expect(resolveBand(0, BANDS)?.grade).toBe("F");
    expect(resolveBand(65, BANDS)?.grade).toBe("B");
  });

  it("returns null outside all configured bands", () => {
    expect(resolveBand(69.9995, BANDS)).toBeNull();
  });
});

describe("computeGpa", () => {
  it("computes a credit-weighted average", () => {
    expect(
      computeGpa([
        { points: 5, creditUnits: 3 },
        { points: 3, creditUnits: 3 },
      ]),
    ).toBe(4);
  });

  it("ignores ungraded courses and returns null when nothing is graded", () => {
    expect(computeGpa([{ points: null, creditUnits: 3 }])).toBeNull();
    expect(
      computeGpa([
        { points: 4, creditUnits: 2 },
        { points: null, creditUnits: 5 },
      ]),
    ).toBe(4);
  });
});

describe("computeAttendance", () => {
  it("excludes excused absences from the denominator", () => {
    const tally = computeAttendance([
      { status: "PRESENT" },
      { status: "LATE" },
      { status: "ABSENT" },
      { status: "EXCUSED" },
    ]);
    expect(tally).toMatchObject({ present: 1, late: 1, absent: 1, excused: 1, total: 4 });
    expect(tally.percentage).toBe(66.67);
  });

  it("counts late as attended", () => {
    expect(computeAttendance([{ status: "LATE" }]).percentage).toBe(100);
  });

  it("returns 0 when every record is excused", () => {
    expect(computeAttendance([{ status: "EXCUSED" }]).percentage).toBe(0);
  });

  it("handles an empty record set", () => {
    expect(computeAttendance([]).percentage).toBe(0);
  });
});

describe("isValidScore", () => {
  it("rejects out-of-range and non-finite values", () => {
    expect(isValidScore(10, 20)).toBe(true);
    expect(isValidScore(0, 20)).toBe(true);
    expect(isValidScore(20, 20)).toBe(true);
    expect(isValidScore(20.01, 20)).toBe(false);
    expect(isValidScore(-1, 20)).toBe(false);
    expect(isValidScore(Number.NaN, 20)).toBe(false);
  });
});
