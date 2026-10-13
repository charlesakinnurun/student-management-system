import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole } from "@/lib/auth/session";
import { createFeeSchema } from "@/lib/validation/fee";
import { createFee, listFees } from "@/lib/services/fee.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    await requireRole("ADMIN");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["createdAt", "status", "amountDue"],
      defaultSort: "createdAt",
    });
    const params = req.nextUrl.searchParams;
    const { items, total } = await listFees(query, {
      studentId: params.get("studentId") ?? undefined,
      sessionId: params.get("sessionId") ?? undefined,
      status: params.get("status") ?? undefined,
    });
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, createFeeSchema);
    return created(await createFee(input, { userId: session.userId, staffProfileId: session.staffProfileId }));
  });
}
