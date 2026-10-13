import { z } from "zod";

/**
 * Canonical allowed values for the string columns that would otherwise be
 * native enums. SQLite cannot store enums, so these constants + Zod schemas are
 * the single source of truth for both validation and TypeScript narrowing.
 * See docs/ARCHITECTURE.md [D-9].
 */

// --- User ---------------------------------------------------------------
export const USER_ROLES = ["ADMIN", "LECTURER", "STUDENT"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// --- Academic lifecycle -------------------------------------------------
export const ENROLLMENT_STATUSES = ["PENDING", "ACTIVE", "COMPLETED", "WITHDRAWN"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const ASSESSMENT_TYPES = [
  "ASSIGNMENT",
  "TEST",
  "QUIZ",
  "MIDTERM",
  "EXAM",
  "PROJECT",
] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const FEE_STATUSES = ["UNPAID", "PARTIAL", "PAID", "OVERDUE"] as const;
export type FeeStatus = (typeof FEE_STATUSES)[number];

export const ANNOUNCEMENT_AUDIENCES = ["ALL", "ADMIN", "LECTURER", "STUDENT"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

// Zod mirrors (used by route-level validation and the UI).
export const zUserRole = z.enum(USER_ROLES);
export const zUserStatus = z.enum(USER_STATUSES);
export const zEnrollmentStatus = z.enum(ENROLLMENT_STATUSES);
export const zAssessmentType = z.enum(ASSESSMENT_TYPES);
export const zAttendanceStatus = z.enum(ATTENDANCE_STATUSES);
export const zFeeStatus = z.enum(FEE_STATUSES);
export const zAnnouncementAudience = z.enum(ANNOUNCEMENT_AUDIENCES);
export const zGender = z.enum(GENDERS);

/** Attendance statuses that count towards "attended" for percentage purposes. */
export const ATTENDED_STATUSES: readonly AttendanceStatus[] = ["PRESENT", "LATE"];

/** Attendance statuses that are excluded from the denominator (authorised). */
export const EXCUSED_STATUSES: readonly AttendanceStatus[] = ["EXCUSED"];
