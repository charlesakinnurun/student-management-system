import { z } from "zod";

/** Reusable Zod primitives shared by every module. */

export const zId = z.string().trim().min(1, "Required");

/** Coerce to a real Date and reject invalid calendar values. */
export const zDate = z.coerce
  .date()
  .refine((value) => !Number.isNaN(value.getTime()), { message: "Invalid date" });

/** Optional date that treats an empty string (empty form input) as absent. */
export const zOptionalDate = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  zDate.optional(),
);

/** Optional trimmed string; empty strings become undefined. */
export const zOptionalString = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().trim().min(1).optional(),
);

export const zEmail = z.email("Enter a valid email address").trim().toLowerCase();

/** Password policy mirrored from lib/auth/password.ts. */
export const zPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/\d/, "Password must include a number");

export const zLevel = z.string().trim().min(1).max(20);

/** Non-negative money amount with at most 2 decimals. */
export const zMoney = z.coerce
  .number()
  .finite()
  .min(0, "Amount cannot be negative")
  .refine((value) => Math.round(value * 100) === value * 100, "At most 2 decimal places");

export const zCreditUnits = z.coerce.number().int().min(1).max(12);

export const zPercent = z.coerce.number().finite().min(0).max(100);
