import { prisma } from "@/lib/db";
import { conflict, unprocessable } from "@/lib/http/errors";
import { notFound } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import type { ListQuery } from "@/lib/http/pagination";
import type { CreateUserInput } from "@/lib/validation/user";
import type { Actor } from "@/lib/services/score.service";
import type { UserRole, UserStatus } from "@/lib/domain/enums";

export const userSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  studentProfile: { select: { id: true, studentId: true, firstName: true, lastName: true } },
  staffProfile: { select: { id: true, staffId: true, firstName: true, lastName: true } },
} as const;

export interface UserFilters {
  role?: string;
  status?: string;
}

export async function listUsers(query: ListQuery, filters: UserFilters) {
  const where = {
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(query.q ? { email: { contains: query.q } } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { [query.sort]: query.order },
      skip: query.skip,
      take: query.take,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) throw notFound("User not found");
  return user;
}

export async function createUserAccount(input: CreateUserInput, actor: Actor) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("A user with this email already exists");

  const user = await prisma.user.create({
    data: {
      email: input.email,
      role: input.role,
      status: "ACTIVE",
      passwordHash: await hashPassword(input.password),
      createdBy: actor.userId,
    },
    select: userSelect,
  });
  await recordAudit({
    actorId: actor.userId,
    action: "user.create",
    resource: "User",
    resourceId: user.id,
    metadata: { role: input.role },
  });
  return user;
}

export async function updateUser(
  id: string,
  input: { role?: UserRole; status?: UserStatus },
  actor: Actor,
) {
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
  if (!existing) throw notFound("User not found");

  if (id === actor.userId && input.role && input.role !== existing.role) {
    throw unprocessable("You cannot change your own role");
  }
  if (id === actor.userId && input.status && input.status !== "ACTIVE") {
    throw unprocessable("You cannot deactivate your own account");
  }

  const user = await prisma.user.update({
    where: { id },
    data: { ...input, updatedBy: actor.userId },
    select: userSelect,
  });

  if (input.role && input.role !== existing.role) {
    await recordAudit({
      actorId: actor.userId,
      action: "user.role_change",
      resource: "User",
      resourceId: id,
      metadata: { from: existing.role, to: input.role },
    });
  }
  if (input.status && input.status !== existing.status) {
    await recordAudit({
      actorId: actor.userId,
      action: "user.status_change",
      resource: "User",
      resourceId: id,
      metadata: { from: existing.status, to: input.status },
    });
  }
  return user;
}

export async function deleteUser(id: string, actor: Actor) {
  if (id === actor.userId) throw unprocessable("You cannot delete your own account");
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!existing) throw notFound("User not found");

  await prisma.user.delete({ where: { id } });
  await recordAudit({
    actorId: actor.userId,
    action: "user.delete",
    resource: "User",
    resourceId: id,
    metadata: { email: existing.email },
  });
}
