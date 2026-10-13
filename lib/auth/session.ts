import { cookies } from "next/headers";
import type { UserRole, UserStatus } from "@/lib/domain/enums";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyToken } from "@/lib/auth/tokens";
import { forbidden, unauthorized } from "@/lib/http/errors";
import { parseDurationSeconds } from "@/lib/utils";

export const ACCESS_COOKIE = "sms_at";
export const REFRESH_COOKIE = "sms_rt";

export interface Session {
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  /** Display name derived from the linked profile, falling back to email. */
  name: string;
  /** Linked StudentProfile id, when the user is a student. */
  studentProfileId: string | null;
  /** Linked StaffProfile id, when the user is staff/lecturer. */
  staffProfileId: string | null;
}

interface CookieSet {
  set: (
    name: string,
    value: string,
    options: {
      httpOnly?: boolean;
      sameSite?: "lax" | "strict" | "none";
      secure?: boolean;
      path?: string;
      maxAge?: number;
    },
  ) => unknown;
  delete: (name: string) => unknown;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.isProduction,
    path: "/",
    maxAge,
  };
}

/** Issue access + refresh cookies onto an outgoing response. */
export function applyAuthCookies(
  response: CookieSet,
  tokens: { accessToken: string; refreshToken: string },
): void {
  // Cookie lifetimes track the configured token lifetimes so a stale cookie
  // cannot outlive (or be evicted before) the JWT it carries.
  response.set(
    ACCESS_COOKIE,
    tokens.accessToken,
    cookieOptions(parseDurationSeconds(env.JWT_EXPIRES_IN, 60 * 15)),
  );
  response.set(
    REFRESH_COOKIE,
    tokens.refreshToken,
    cookieOptions(parseDurationSeconds(env.REFRESH_TOKEN_EXPIRES_IN, 60 * 60 * 24 * 7)),
  );
}

export function clearAuthCookies(response: CookieSet): void {
  response.delete(ACCESS_COOKIE);
  response.delete(REFRESH_COOKIE);
}

/**
 * Resolve the current session from cookies.
 *
 * The access token is preferred; the refresh token is accepted as a fallback so
 * server-rendered pages remain usable (a server component cannot set cookies to
 * rotate the access token). The user row is re-read on every call so that
 * suspended/deleted accounts and role changes take effect immediately rather
 * than at token expiry.
 */
export async function getSession(): Promise<Session | null> {
  const store = cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  const refresh = store.get(REFRESH_COOKIE)?.value;

  const claims = (await verifyToken(access)) ?? (await verifyToken(refresh));
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      studentProfile: { select: { id: true, firstName: true, lastName: true } },
      staffProfile: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!user || user.status !== "ACTIVE") return null;

  const profile = user.studentProfile ?? user.staffProfile;
  const name = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : user.email.split("@")[0];

  return {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    status: user.status as UserStatus,
    name,
    studentProfileId: user.studentProfile?.id ?? null,
    staffProfileId: user.staffProfile?.id ?? null,
  };
}

/** Require any authenticated user. Throws 401 otherwise. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw unauthorized();
  return session;
}

/** Require one of the given roles. Throws 401 then 403. */
export async function requireRole(...roles: UserRole[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.role)) throw forbidden();
  return session;
}
