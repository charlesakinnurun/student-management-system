import { z } from "zod";
import { zOptionalString } from "@/lib/validation/common";

// --- Faculty ------------------------------------------------------------
export const createFacultySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  code: z.string().trim().min(2).max(12).toUpperCase(),
  description: zOptionalString,
});
export const updateFacultySchema = createFacultySchema.partial();

// --- Department ---------------------------------------------------------
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  code: z.string().trim().min(2).max(12).toUpperCase(),
  facultyId: z.string().trim().min(1, "Faculty is required"),
});
export const updateDepartmentSchema = createDepartmentSchema.partial();

// --- Program ------------------------------------------------------------
export const createProgramSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(140),
  code: z.string().trim().min(2).max(16).toUpperCase(),
  departmentId: z.string().trim().min(1, "Department is required"),
  level: zOptionalString,
});
export const updateProgramSchema = createProgramSchema.partial();

export type CreateFacultyInput = z.infer<typeof createFacultySchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateProgramInput = z.infer<typeof createProgramSchema>;
