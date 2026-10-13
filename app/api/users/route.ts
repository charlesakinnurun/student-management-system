import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole } from "@/lib/auth/session";
import { createUserSchema } from "@/lib/validation/user";
import { createUserAccount, listUsers } from "@/lib/services/user.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["createdAt", "email", "role", "status"],
      defaultSort: "createdAt",
    });
    const params = req.nextUrl.searchParams;
    const { items, total } = await listUsers(query, {
      role: params.get("role") ?? undefined,
      status: params.get("status") ?? undefined,
    });
    void session;
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, createUserSchema);
    return created(
      await createUserAccount(input, { userId: session.userId, staffProfileId: session.staffProfileId }),
    );
  });
}
