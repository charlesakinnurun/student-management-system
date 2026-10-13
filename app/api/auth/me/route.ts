import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireSession();
    // Only expose non-sensitive fields that the client needs.
    return ok({
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
        status: session.status,
        name: session.name,
        studentProfileId: session.studentProfileId,
        staffProfileId: session.staffProfileId,
      },
    });
  });
}
