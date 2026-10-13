import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { getSession, clearAuthCookies } from "@/lib/auth/session";
import { logout } from "@/lib/services/auth.service";

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    // Best-effort: record the event if we can identify the user, then clear cookies.
    const session = await getSession();
    if (session) await logout(session.userId);

    const response = ok({ success: true });
    clearAuthCookies(response.cookies);
    return response;
  });
}
