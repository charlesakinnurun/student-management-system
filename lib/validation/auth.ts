import { z } from "zod";
import { zEmail, zPassword } from "@/lib/validation/common";

export const loginSchema = z.object({
  email: zEmail,
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
