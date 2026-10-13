import { prisma } from "@/lib/db";
import { conflict, notFound, unprocessable } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import type { ListQuery } from "@/lib/http/pagination";
import { generateTemporaryPassword, nextStaffId } from "@/lib/services/ids";
import type { CreateStaffInput, UpdateStaffInput } from "@/lib/validation/staff";

export const staffSelect = {
  id: true,
  staffId: true,
  firstName: true,
  lastName: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, email: true, role: true, status: true } },
  department: { select: { id: true, name: true, code: true } },
  _count: { select: { assignments: true } },
} as const;

export interface StaffFilters {
  departmentId?: string;
  role?: string;
}

export async function listStaff(query: ListQuery, filters: StaffFilters) {
  const where = {
    ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    ...(filters.role ? { user: { role: filters.role } } : {}),
    ...(query.q
      ? {
          OR: [
            { firstName: { contains: query.q } },
            { lastName: { contains: query.q } },
            { staffId: { contains: query.q } },
            { user: { email: { contains: query.q } } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.staffProfile.findMany({
      where,
      select: staffSelect,
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
    }),
    prisma.staffProfile.count({ where }),
  ]);

  return { items, total };
}

export async function getStaffById(id: string) {
  const staff = await prisma.staffProfile.findUnique({ where: { id }, select: staffSelect });
  if (!staff) throw notFound("Staff member not found");
  return staff;
}

export async function getStaffDetail(id: string) {
  const staff = await prisma.staffProfile.findUnique({
    where: { id },
    select: {
      ...staffSelect,
      assignments: {
        select: {
          id: true,
          session: { select: { id: true, name: true } },
          course: {
            select: {
              id: true,
              code: true,
              title: true,
              level: true,
              _count: { select: { enrollments: true } },
            },
          },
        },
      },
    },
  });
  if (!staff) throw notFound("Staff member not found");
  return staff;
}

export async function createStaff(
  input: CreateStaffInput,
  actorId: string,
): Promise<{ staff: Awaited<ReturnType<typeof getStaffById>>; temporaryPassword?: string }> {
  if (input.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!dept) throw unprocessable("Selected department does not exist");
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("A user with this email already exists");

  const staffId = input.staffId ?? (await nextStaffId());
  const password = input.password ?? generateTemporaryPassword();
  const passwordHash = await hashPassword(password);

  const created = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: input.role ?? "LECTURER",
      status: "ACTIVE",
      createdBy: actorId,
      staffProfile: {
        create: {
          staffId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          departmentId: input.departmentId,
        },
      },
    },
    select: { staffProfile: { select: { id: true } } },
  });

  const staff = await getStaffById(created.staffProfile!.id);
  await recordAudit({
    actorId,
    action: "staff.create",
    resource: "StaffProfile",
    resourceId: staff.id,
    metadata: { staffId: staff.staffId, role: input.role ?? "LECTURER" },
  });

  return { staff, temporaryPassword: input.password ? undefined : password };
}

export async function updateStaff(id: string, input: UpdateStaffInput, actorId: string) {
  const existing = await prisma.staffProfile.findUnique({
    where: { id },
    select: { id: true, userId: true, staffId: true },
  });
  if (!existing) throw notFound("Staff member not found");

  if (input.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!dept) throw unprocessable("Selected department does not exist");
  }
  if (input.email) {
    const taken = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id: existing.userId } },
      select: { id: true },
    });
    if (taken) throw conflict("A user with this email already exists");
  }

  const { email, role, staffId, ...profile } = input;
  if (staffId) throw unprocessable("Staff ID cannot be changed");

  await prisma.$transaction([
    prisma.staffProfile.update({ where: { id }, data: profile }),
    prisma.user.update({
      where: { id: existing.userId },
      data: {
        ...(email ? { email } : {}),
        ...(role ? { role } : {}),
        updatedBy: actorId,
      },
    }),
  ]);

  await recordAudit({
    actorId,
    action: "staff.update",
    resource: "StaffProfile",
    resourceId: id,
    metadata: { fields: Object.keys(input) },
  });

  return getStaffById(id);
}

export async function deleteStaff(id: string, actorId: string): Promise<void> {
  const existing = await prisma.staffProfile.findUnique({
    where: { id },
    select: { id: true, userId: true, staffId: true },
  });
  if (!existing) throw notFound("Staff member not found");

  await prisma.user.delete({ where: { id: existing.userId } });
  await recordAudit({
    actorId,
    action: "staff.delete",
    resource: "StaffProfile",
    resourceId: id,
    metadata: { staffId: existing.staffId },
  });
}

/** Staff profile for the authenticated user (lecturer dashboards). */
export async function getStaffByUserId(userId: string) {
  const staff = await prisma.staffProfile.findUnique({ where: { userId }, select: staffSelect });
  if (!staff) throw notFound("Staff profile not found");
  return staff;
}
