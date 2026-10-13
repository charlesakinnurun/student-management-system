import { z } from "zod";

/** A single score upsert. `rawScore` upper bound is checked against the
 * assessment's maxScore inside the service (it needs the DB value). */
export const upsertScoreSchema = z.object({
  assessmentId: z.string().trim().min(1, "Assessment is required"),
  enrollmentId: z.string().trim().min(1, "Enrollment is required"),
  rawScore: z.coerce.number().finite().min(0, "Score cannot be negative"),
  reason: z.string().trim().max(255).optional(),
});

/** Bulk entry from the score grid. */
export const bulkScoreSchema = z.object({
  assessmentId: z.string().trim().min(1),
  scores: z
    .array(
      z.object({
        enrollmentId: z.string().trim().min(1),
        rawScore: z.coerce.number().finite().min(0),
      }),
    )
    .min(1, "No scores submitted"),
});

export type UpsertScoreInput = z.infer<typeof upsertScoreSchema>;
export type BulkScoreInput = z.infer<typeof bulkScoreSchema>;
