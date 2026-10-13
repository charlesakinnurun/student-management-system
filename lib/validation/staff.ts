import { z } from "zod";
import { zEmail, zOptionalString, zPassword } from "@/lib/validation/common";

const baseStaffFields = {
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: zOptionalString,
  departmentId: zOptionalString,
  /** LECTURER (default) or ADMIN. */
  role: z.enum(["ADMIN", "LECTURER"]).optional(),
};

export const createStaffSchema = z.object({
  ...baseStaffFields,
  email: zEmail,
  password: zPassword.optional(),
  staffId: zOptionalString,
});

export const updateStaffSchema = z
  .object({ ...baseStaffFields, email: zEmail.optional(), staffId: zOptionalString })
  .partial();

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
