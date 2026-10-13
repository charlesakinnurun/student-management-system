import type { UserRole } from "@/lib/domain/enums";
import { prisma } from "@/lib/db";
import { forbidden, unauthorized } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/tokens";

/** bcrypt hash of a value that can never be a real password. Used to equalise
 * login timing so the response does not reveal whether the email exists. */
const DUMMY_HASH = "$2b$12$cCwtamD97DXSESZ7SzWUOuSXZgXLail75OKXHDmYIwbPuzM5/ueCC";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginResult {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Verify credentials and issue tokens.
 * Always returns the same generic message for unknown email vs wrong password.
 */
export async function authenticate(email: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, status: true, passwordHash: true },
  });

  const passwordValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordValid) {
    await recordAudit({
      actorId: user?.id ?? null,
      action: "auth.login_failed",
      resource: "User",
      resourceId: user?.id ?? null,
      metadata: { email },
    });
    throw unauthorized("Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    await recordAudit({
      actorId: user.id,
      action: "auth.login_blocked",
      resource: "User",
      resourceId: user.id,
      metadata: { status: user.status },
    });
    throw forbidden("Your account is not active. Please contact an administrator.");
  }

  const role = user.role as UserRole;
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: user.id, role }),
    signRefreshToken({ sub: user.id, role }),
  ]);

  await recordAudit({
    actorId: user.id,
    action: "auth.login",
    resource: "User",
    resourceId: user.id,
  });

  return { user: { id: user.id, email: user.email, role }, accessToken, refreshToken };
}

export async function logout(userId: string): Promise<void> {
  await recordAudit({ actorId: userId, action: "auth.logout", resource: "User", resourceId: userId });
}
