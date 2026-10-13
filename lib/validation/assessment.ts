import { z } from "zod";
import { zAssessmentType } from "@/lib/domain/enums";
import { zOptionalDate, zPercent } from "@/lib/validation/common";

export const createAssessmentSchema = z.object({
  courseId: z.string().trim().min(1, "Course is required"),
  type: zAssessmentType,
  title: z.string().trim().min(2, "Title is required").max(140),
  maxScore: z.coerce.number().finite().positive("Max score must be greater than 0").max(1000),
  weight: zPercent,
  dueDate: zOptionalDate,
  isPublished: z.coerce.boolean().optional(),
});

export const updateAssessmentSchema = z
  .object({
    type: zAssessmentType.optional(),
    title: z.string().trim().min(2).max(140).optional(),
    maxScore: z.coerce.number().finite().positive().max(1000).optional(),
    weight: zPercent.optional(),
    dueDate: zOptionalDate,
    isPublished: z.coerce.boolean().optional(),
  })
  .partial();

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;
