import type { NextRequest } from "next/server";
import { apiHandler, parseJson } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { buildMeta, parseListQuery } from "@/lib/http/pagination";
import { requireRole } from "@/lib/auth/session";
import { createEnrollmentSchema } from "@/lib/validation/enrollment";
import { createEnrollment, listEnrollments } from "@/lib/services/enrollment.service";

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN", "LECTURER");
    const query = parseListQuery(req.nextUrl.searchParams, {
      sortable: ["enrolledAt", "status"],
      defaultSort: "enrolledAt",
    });
    const params = req.nextUrl.searchParams;
    const { items, total } = await listEnrollments(query, {
      studentId: params.get("studentId") ?? undefined,
      courseId: params.get("courseId") ?? undefined,
      sessionId: params.get("sessionId") ?? undefined,
      semesterId: params.get("semesterId") ?? undefined,
      status: params.get("status") ?? undefined,
      lecturerId: session.role === "LECTURER" ? session.staffProfileId ?? "none" : undefined,
    });
    return ok(items, buildMeta(total, query.page, query.pageSize));
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    const input = await parseJson(req, createEnrollmentSchema);
    return created(await createEnrollment(input, session.userId));
  });
}
