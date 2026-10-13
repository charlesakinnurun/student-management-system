import { z } from "zod";
import { zAnnouncementAudience } from "@/lib/domain/enums";
import { zOptionalString } from "@/lib/validation/common";

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(160),
  body: z.string().trim().min(3, "Body is required").max(5000),
  audience: zAnnouncementAudience.default("ALL"),
  courseId: zOptionalString,
  departmentId: zOptionalString,
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
