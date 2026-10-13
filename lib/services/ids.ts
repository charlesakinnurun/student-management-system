import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Sequential, human-readable institutional identifiers.
 *
 * Uniqueness is ultimately guaranteed by the `@unique` constraints on
 * `StudentProfile.studentId` / `StaffProfile.staffId`; a concurrent collision
 * surfaces as a clean 409 rather than corrupt data.
 */
export function generateTemporaryPassword(length = 10): string {
  // Base64url avoids ambiguous shell-quoting characters in shared credentials.
  return randomBytes(24).toString("base64url").slice(0, length);
}

export async function nextStudentId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `STU-${year}-`;
  const last = await prisma.studentProfile.findFirst({
    where: { studentId: { startsWith: prefix } },
    orderBy: { studentId: "desc" },
    select: { studentId: true },
  });
  const sequence = last ? Number(last.studentId.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(Number.isFinite(sequence) ? sequence : 1).padStart(4, "0")}`;
}

export async function nextStaffId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `STF-${year}-`;
  const last = await prisma.staffProfile.findFirst({
    where: { staffId: { startsWith: prefix } },
    orderBy: { staffId: "desc" },
    select: { staffId: true },
  });
  const sequence = last ? Number(last.staffId.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(Number.isFinite(sequence) ? sequence : 1).padStart(4, "0")}`;
}
