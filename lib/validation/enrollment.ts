import { z } from "zod";
import { zEnrollmentStatus } from "@/lib/domain/enums";

export const createEnrollmentSchema = z.object({
  studentId: z.string().trim().min(1, "Student is required"),
  courseId: z.string().trim().min(1, "Course is required"),
  sessionId: z.string().trim().min(1, "Session is required"),
  semesterId: z.string().trim().min(1, "Semester is required"),
  status: zEnrollmentStatus.optional(),
});

/** Bulk enrolment: one student → many courses. */
export const bulkEnrollSchema = z.object({
  studentId: z.string().trim().min(1, "Student is required"),
  courseIds: z.array(z.string().trim().min(1)).min(1, "Select at least one course"),
  sessionId: z.string().trim().min(1, "Session is required"),
  semesterId: z.string().trim().min(1, "Semester is required"),
});

export const updateEnrollmentSchema = z.object({
  status: zEnrollmentStatus,
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type BulkEnrollInput = z.infer<typeof bulkEnrollSchema>;
