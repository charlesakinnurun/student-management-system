import { z } from "zod";

export const gradingBandSchema = z
  .object({
    grade: z.string().trim().min(1, "Grade is required").max(4).toUpperCase(),
    minScore: z.coerce.number().finite().min(0).max(100),
    maxScore: z.coerce.number().finite().min(0).max(100),
    points: z.coerce.number().finite().min(0).max(10),
  })
  .refine((band) => band.maxScore > band.minScore, {
    message: "Max score must be greater than min score",
    path: ["maxScore"],
  });

export const upsertGradingSetSchema = z.object({
  setName: z.string().trim().min(1).max(60),
  bands: z.array(gradingBandSchema).min(1, "At least one band is required"),
});

export type UpsertGradingSetInput = z.infer<typeof upsertGradingSetSchema>;

export const createUserSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  role: z.enum(["ADMIN", "LECTURER", "STUDENT"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateUserSchema = z
  .object({
    role: z.enum(["ADMIN", "LECTURER", "STUDENT"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  })
  .partial();

export type CreateUserInput = z.infer<typeof createUserSchema>;
