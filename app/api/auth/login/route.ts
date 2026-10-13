import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { loginSchema } from "@/lib/validation/auth";
import { authenticate } from "@/lib/services/auth.service";
import { applyAuthCookies } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { ROLE_HOME } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    // Throttle brute-force attempts per client IP.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    enforceRateLimit({ key: `login:${ip}`, limit: 10, windowMs: 60_000 });

    const input = await parseJson(req, loginSchema);
    const result = await authenticate(input.email, input.password);

    const response = ok({
      user: result.user,
      redirectTo: ROLE_HOME[result.user.role],
    });
    applyAuthCookies(response.cookies, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return response;
  });
}
