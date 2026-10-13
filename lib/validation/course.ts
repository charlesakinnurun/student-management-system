import { z } from "zod";
import { zCreditUnits, zOptionalString } from "@/lib/validation/common";

export const createCourseSchema = z.object({
  code: z.string().trim().min(3, "Course code is required").max(16).toUpperCase(),
  title: z.string().trim().min(3, "Course title is required").max(160),
  description: zOptionalString,
  creditUnits: zCreditUnits.default(3),
  departmentId: z.string().trim().min(1, "Department is required"),
  level: zOptionalString,
  venue: zOptionalString,
  scheduleDays: zOptionalString,
  startTime: zOptionalString,
  endTime: zOptionalString,
  semesterId: zOptionalString,
  /** StaffProfile id of the lecturer to assign for the given session. */
  lecturerId: zOptionalString,
  /** Session the lecturer assignment applies to. */
  sessionId: zOptionalString,
});

export const updateCourseSchema = createCourseSchema.partial();

/** Assigning/removing a lecturer from a course for a session. */
export const assignLecturerSchema = z.object({
  courseId: z.string().trim().min(1, "Course is required"),
  staffId: z.string().trim().min(1, "Lecturer is required"),
  sessionId: z.string().trim().min(1, "Session is required"),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
