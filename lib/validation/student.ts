import { z } from "zod";
import { zEnrollmentStatus, zGender } from "@/lib/domain/enums";
import { zEmail, zOptionalDate, zOptionalString, zPassword } from "@/lib/validation/common";

/** Fields shared by student create and update. */
const baseStudentFields = {
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: zOptionalString,
  dateOfBirth: zOptionalDate,
  gender: zGender.optional(),
  address: zOptionalString,
  photoUrl: zOptionalString,
  facultyId: zOptionalString,
  departmentId: zOptionalString,
  programId: zOptionalString,
  level: zOptionalString,
  sessionId: zOptionalString,
  emergencyContact: zOptionalString,
  admissionDate: zOptionalDate,
  status: zEnrollmentStatus.optional(),
};

export const createStudentSchema = z.object({
  ...baseStudentFields,
  email: zEmail,
  /** Optional: when omitted the service provisions and returns a temporary one. */
  password: zPassword.optional(),
  /** Optional: when omitted the service generates the next sequential id. */
  studentId: zOptionalString,
});

export const updateStudentSchema = z
  .object({
    ...baseStudentFields,
    email: zEmail.optional(),
    // Accepted so we can return a clear error rather than silently ignoring it.
    studentId: zOptionalString,
  })
  .partial();

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
