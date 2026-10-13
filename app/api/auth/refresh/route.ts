import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { ok, failure } from "@/lib/http/response";
import { unauthorized } from "@/lib/http/errors";
import { prisma } from "@/lib/db";
import { verifyToken, signAccessToken } from "@/lib/auth/tokens";
import { applyAuthCookies, ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/session";
import type { UserRole } from "@/lib/domain/enums";

/**
 * Rotate the short-lived access token using the refresh token.
 * The client API wrapper calls this once on a 401 and replays the request.
 */
export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
    const claims = await verifyToken(refresh);
    if (!claims) throw unauthorized("Session expired, please sign in again");

    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, role: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      const response = failure(unauthorized("Account is not active"));
      response.cookies.delete(ACCESS_COOKIE);
      response.cookies.delete(REFRESH_COOKIE);
      return response;
    }

    const accessToken = await signAccessToken({ sub: user.id, role: user.role as UserRole });
    const response = ok({ refreshed: true });
    // Reuse the existing refresh token as the cookie helper sets both values.
    applyAuthCookies(response.cookies, { accessToken, refreshToken: refresh! });
    return response;
  });
}
