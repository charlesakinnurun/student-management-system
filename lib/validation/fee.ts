import { z } from "zod";
import { zFeeStatus } from "@/lib/domain/enums";
import { zMoney, zOptionalDate, zOptionalString } from "@/lib/validation/common";

export const createFeeSchema = z.object({
  studentId: z.string().trim().min(1, "Student is required"),
  sessionId: z.string().trim().min(1, "Session is required"),
  amountDue: zMoney,
  dueDate: zOptionalDate,
  status: zFeeStatus.optional(),
});

export const updateFeeSchema = z
  .object({
    amountDue: zMoney.optional(),
    dueDate: zOptionalDate,
    status: zFeeStatus.optional(),
  })
  .partial();

export const createPaymentSchema = z.object({
  feeId: z.string().trim().min(1, "Fee is required"),
  amount: zMoney.refine((value) => value > 0, "Payment amount must be greater than 0"),
  method: zOptionalString,
  reference: zOptionalString,
});

export type CreateFeeInput = z.infer<typeof createFeeSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
