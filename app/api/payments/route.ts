import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { created } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { createPaymentSchema } from "@/lib/validation/fee";
import { recordPayment } from "@/lib/services/fee.service";

/** POST /api/payments — record a payment against a fee. */
export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, createPaymentSchema);
    return created(
      await recordPayment(input, { userId: session.userId, staffProfileId: session.staffProfileId }),
    );
  });
}
