import { z } from "zod";
import { zDate } from "@/lib/validation/common";

export const createSessionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .regex(/^\d{4}\/\d{4}$/, "Use the format YYYY/YYYY (e.g. 2025/2026)"),
    startDate: zDate,
    endDate: zDate,
    isCurrent: z.coerce.boolean().optional(),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export const updateSessionSchema = z
  .object({
    name: z.string().trim().regex(/^\d{4}\/\d{4}$/).optional(),
    startDate: zDate.optional(),
    endDate: zDate.optional(),
    isCurrent: z.coerce.boolean().optional(),
  })
  .partial();

export const createSemesterSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(60),
    sessionId: z.string().trim().min(1, "Session is required"),
    startDate: zDate,
    endDate: zDate,
    isCurrent: z.coerce.boolean().optional(),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export const updateSemesterSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    startDate: zDate.optional(),
    endDate: zDate.optional(),
    isCurrent: z.coerce.boolean().optional(),
  })
  .partial();

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CreateSemesterInput = z.infer<typeof createSemesterSchema>;
