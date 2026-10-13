import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge middleware — coarse-grained route protection and role-area enforcement.
 *
 * It verifies the JWT signature so unauthenticated users are redirected before
 * a page renders. It is *not* the authorisation boundary: every API route and
 * server component re-checks the session (and the user's current status/role)
 * against the database in `lib/auth/session.ts`.
 */
const ACCESS_COOKIE = "sms_at";
const REFRESH_COOKIE = "sms_rt";

const AREA_ROLE: Record<string, string> = {
  "/admin": "ADMIN",
  "/lecturer": "LECTURER",
  "/student": "STUDENT",
};

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  LECTURER: "/lecturer",
  STUDENT: "/student",
};

async function verify(token: string | undefined): Promise<{ role: string } | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload.role !== "string") return null;
    return { role: payload.role };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const area = Object.keys(AREA_ROLE).find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!area) return NextResponse.next();

  const token = req.cookies.get(ACCESS_COOKIE)?.value ?? req.cookies.get(REFRESH_COOKIE)?.value;
  const claims = await verify(token);

  if (!claims) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (claims.role !== AREA_ROLE[area]) {
    // Authenticated but wrong area — send them to their own dashboard.
    return NextResponse.redirect(new URL(ROLE_HOME[claims.role] ?? "/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/lecturer/:path*", "/student/:path*"],
};
