import { round } from "@/lib/utils";
import { ATTENDED_STATUSES, EXCUSED_STATUSES, type AttendanceStatus } from "@/lib/domain/enums";

/**
 * Pure grading / GPA / attendance domain logic.
 *
 * Kept free of Prisma and HTTP so it can be unit-tested in isolation and reused
 * by services, dashboards and the student portal. Grading bands are *data*
 * (GradingRule rows), never hardcoded here.
 */

export interface AssessmentWeight {
  id: string;
  maxScore: number;
  weight: number; // percentage contribution to the course total
}

export interface ScoreEntry {
  assessmentId: string;
  rawScore: number;
}

export interface GradingBand {
  minScore: number;
  maxScore: number;
  grade: string;
  points: number;
}

export interface CourseResult {
  /** Weighted percentage over all assessments (missing scores count as 0). */
  total: number;
  /** Percentage of course weight that has a score entered. */
  gradedWeight: number;
  /** True when every assessment has a score. */
  isComplete: boolean;
  /** Decimal grade points, when a matching band exists. */
  points: number | null;
  /** Letter grade, when a matching band exists. */
  grade: string | null;
}

const EPSILON = 0.001;

/**
 * Weighted course total. Each assessment contributes
 * `(rawScore / maxScore) * weight`. With weights summing to 100 the result is a
 * 0–100 percentage. Missing scores contribute 0 and reduce `gradedWeight`.
 */
export function computeCourseResult(
  assessments: AssessmentWeight[],
  scores: ScoreEntry[],
  bands: GradingBand[] = [],
): CourseResult {
  const scoreByAssessment = new Map(scores.map((s) => [s.assessmentId, s.rawScore]));

  let total = 0;
  let gradedWeight = 0;
  let hasScores = false;

  for (const assessment of assessments) {
    const raw = scoreByAssessment.get(assessment.id);
    if (raw === undefined) continue;

    hasScores = true;
    gradedWeight += assessment.weight;
    if (assessment.maxScore > 0) {
      total += (raw / assessment.maxScore) * assessment.weight;
    }
  }

  const roundedTotal = round(total, 2);
  const roundedWeight = round(gradedWeight, 2);
  const isComplete = hasScores && Math.abs(gradedWeight - 100) < EPSILON;
  const band = hasScores ? resolveBand(roundedTotal, bands) : null;

  return {
    total: roundedTotal,
    gradedWeight: roundedWeight,
    isComplete,
    points: band?.points ?? null,
    grade: band?.grade ?? null,
  };
}

/** Find the band whose range contains the score (inclusive on both ends). */
export function resolveBand(score: number, bands: GradingBand[]): GradingBand | null {
  const match = bands.find((band) => score >= band.minScore && score <= band.maxScore);
  return match ?? null;
}

/** Credit-weighted GPA on a 0–5 (or configured) scale. Returns null when empty. */
export function computeGpa(rows: Array<{ points: number | null; creditUnits: number }>): number | null {
  const graded = rows.filter((r) => r.points !== null && r.creditUnits > 0);
  if (graded.length === 0) return null;
  const totalCredits = graded.reduce((sum, r) => sum + r.creditUnits, 0);
  if (totalCredits === 0) return null;
  const weighted = graded.reduce((sum, r) => sum + (r.points as number) * r.creditUnits, 0);
  return round(weighted / totalCredits, 2);
}

export interface AttendanceTally {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  /** Present + late over (total − excused), as a 0–100 percentage. */
  percentage: number;
}

/**
 * Attendance percentage. Excused absences are removed from the denominator so
 * authorised absence does not penalise the student; if every record is excused
 * the percentage is 0 (no countable sessions).
 */
export function computeAttendance(records: Array<{ status: AttendanceStatus | string }>): AttendanceTally {
  const tally: AttendanceTally = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total: records.length,
    percentage: 0,
  };

  for (const record of records) {
    switch (record.status) {
      case "PRESENT":
        tally.present += 1;
        break;
      case "ABSENT":
        tally.absent += 1;
        break;
      case "LATE":
        tally.late += 1;
        break;
      case "EXCUSED":
        tally.excused += 1;
        break;
      default:
        break;
    }
  }

  const attended = tally.present + tally.late;
  const denominator = tally.total - tally.excused;
  tally.percentage = denominator > 0 ? round((attended / denominator) * 100, 2) : 0;
  return tally;
}

/** Guard used by the API: a raw score must be within [0, maxScore]. */
export function isValidScore(rawScore: number, maxScore: number): boolean {
  return Number.isFinite(rawScore) && rawScore >= 0 && rawScore <= maxScore;
}

export { ATTENDED_STATUSES, EXCUSED_STATUSES };
