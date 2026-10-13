import { prisma } from "@/lib/db";
import { conflict, notFound, unprocessable } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import type { ListQuery } from "@/lib/http/pagination";
import type { FeeStatus } from "@/lib/domain/enums";
import type { CreateFeeInput, CreatePaymentInput } from "@/lib/validation/fee";
import type { Actor } from "@/lib/services/score.service";

/** Derive the fee status from amounts and due date (single source of truth). */
export function deriveFeeStatus(amountDue: number, amountPaid: number, dueDate?: Date | null): FeeStatus {
  if (amountPaid >= amountDue && amountDue > 0) return "PAID";
  const overdue = dueDate ? dueDate.getTime() < Date.now() : false;
  if (amountPaid <= 0) return overdue ? "OVERDUE" : "UNPAID";
  return overdue ? "OVERDUE" : "PARTIAL";
}

export const feeSelect = {
  id: true,
  amountDue: true,
  amountPaid: true,
  status: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
  session: { select: { id: true, name: true } },
  _count: { select: { payments: true } },
} as const;

export interface FeeFilters {
  studentId?: string;
  sessionId?: string;
  status?: string;
}

export async function listFees(query: ListQuery, filters: FeeFilters) {
  const where = {
    ...(filters.studentId ? { studentId: filters.studentId } : {}),
    ...(filters.sessionId ? { sessionId: filters.sessionId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(query.q
      ? {
          OR: [
            { student: { studentId: { contains: query.q } } },
            { student: { firstName: { contains: query.q } } },
            { student: { lastName: { contains: query.q } } },
          ],
        }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.fee.findMany({
      where,
      select: feeSelect,
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
    }),
    prisma.fee.count({ where }),
  ]);
  return { items, total };
}

export async function getFeeById(id: string) {
  const fee = await prisma.fee.findUnique({
    where: { id },
    select: {
      ...feeSelect,
      payments: {
        select: {
          id: true,
          amount: true,
          method: true,
          reference: true,
          paidAt: true,
          recordedBy: true,
        },
        orderBy: { paidAt: "desc" },
      },
    },
  });
  if (!fee) throw notFound("Fee record not found");
  return fee;
}

export async function createFee(input: CreateFeeInput, actor: Actor) {
  const [student, session] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { id: input.studentId }, select: { id: true } }),
    prisma.academicSession.findUnique({ where: { id: input.sessionId }, select: { id: true } }),
  ]);
  if (!student) throw notFound("Student not found");
  if (!session) throw notFound("Academic session not found");

  const duplicate = await prisma.fee.findFirst({
    where: { studentId: input.studentId, sessionId: input.sessionId },
    select: { id: true },
  });
  if (duplicate) throw conflict("A fee record already exists for this student and session");

  const fee = await prisma.fee.create({
    data: {
      studentId: input.studentId,
      sessionId: input.sessionId,
      amountDue: input.amountDue,
      dueDate: input.dueDate,
      status: input.status ?? deriveFeeStatus(input.amountDue, 0, input.dueDate),
    },
    select: feeSelect,
  });

  await recordAudit({
    actorId: actor.userId,
    action: "fee.create",
    resource: "Fee",
    resourceId: fee.id,
    metadata: { studentId: input.studentId, amountDue: input.amountDue },
  });
  return fee;
}

export async function updateFee(
  id: string,
  input: { amountDue?: number; dueDate?: Date | null; status?: FeeStatus },
  actor: Actor,
) {
  const existing = await prisma.fee.findUnique({ where: { id } });
  if (!existing) throw notFound("Fee record not found");

  const amountDue = input.amountDue ?? existing.amountDue;
  if (amountDue < existing.amountPaid) {
    throw unprocessable("Amount due cannot be less than the amount already paid");
  }
  const dueDate = input.dueDate !== undefined ? input.dueDate : existing.dueDate;
  const status = input.status ?? deriveFeeStatus(amountDue, existing.amountPaid, dueDate);

  const fee = await prisma.fee.update({
    where: { id },
    data: { amountDue, dueDate, status },
    select: feeSelect,
  });
  await recordAudit({
    actorId: actor.userId,
    action: "fee.update",
    resource: "Fee",
    resourceId: id,
    metadata: { amountDue, status },
  });
  return fee;
}

export async function deleteFee(id: string, actor: Actor) {
  const existing = await prisma.fee.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Fee record not found");
  await prisma.fee.delete({ where: { id } });
  await recordAudit({ actorId: actor.userId, action: "fee.delete", resource: "Fee", resourceId: id });
}

/** Record a payment and recompute the parent fee atomically. */
export async function recordPayment(input: CreatePaymentInput, actor: Actor) {
  const fee = await prisma.fee.findUnique({ where: { id: input.feeId } });
  if (!fee) throw notFound("Fee record not found");

  const outstanding = fee.amountDue - fee.amountPaid;
  if (input.amount > outstanding + 0.001) {
    throw unprocessable(`Payment exceeds the outstanding balance of ${outstanding}`);
  }
  if (input.reference) {
    const duplicate = await prisma.payment.findUnique({
      where: { reference: input.reference },
      select: { id: true },
    });
    if (duplicate) throw conflict("A payment with this reference already exists");
  }

  const newPaid = fee.amountPaid + input.amount;
  const status = deriveFeeStatus(fee.amountDue, newPaid, fee.dueDate);

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        feeId: input.feeId,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        recordedBy: actor.userId,
      },
    });
    await tx.fee.update({ where: { id: input.feeId }, data: { amountPaid: newPaid, status } });
    return created;
  });

  await recordAudit({
    actorId: actor.userId,
    action: "payment.create",
    resource: "Payment",
    resourceId: payment.id,
    metadata: { feeId: input.feeId, amount: input.amount },
  });
  return payment;
}

export async function deletePayment(id: string, actor: Actor) {
  const payment = await prisma.payment.findUnique({ where: { id }, include: { fee: true } });
  if (!payment) throw notFound("Payment not found");

  const newPaid = Math.max(0, payment.fee.amountPaid - payment.amount);
  const status = deriveFeeStatus(payment.fee.amountDue, newPaid, payment.fee.dueDate);

  await prisma.$transaction([
    prisma.payment.delete({ where: { id } }),
    prisma.fee.update({ where: { id: payment.feeId }, data: { amountPaid: newPaid, status } }),
  ]);

  await recordAudit({
    actorId: actor.userId,
    action: "payment.delete",
    resource: "Payment",
    resourceId: id,
    metadata: { feeId: payment.feeId, amount: payment.amount },
  });
}

/** Fee records for the authenticated student. */
export async function listStudentFees(studentId: string) {
  return prisma.fee.findMany({
    where: { studentId },
    select: {
      ...feeSelect,
      payments: {
        select: { id: true, amount: true, method: true, reference: true, paidAt: true },
        orderBy: { paidAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
