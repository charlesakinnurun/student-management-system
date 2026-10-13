import { z } from "zod";
import { zAttendanceStatus } from "@/lib/domain/enums";
import { zDate } from "@/lib/validation/common";

export const attendanceRecordSchema = z.object({
  enrollmentId: z.string().trim().min(1, "Enrollment is required"),
  status: zAttendanceStatus,
});

/** Bulk marking for a class on one date (idempotent upsert per enrollment). */
export const bulkAttendanceSchema = z.object({
  courseId: z.string().trim().min(1, "Course is required"),
  date: zDate,
  records: z.array(attendanceRecordSchema).min(1, "No attendance records submitted"),
});

export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
