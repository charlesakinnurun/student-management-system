import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/http/handler";
import { noContent } from "@/lib/http/response";
import { requireRole } from "@/lib/auth/session";
import { unassignLecturer } from "@/lib/services/course.service";

type Ctx = { params: { id: string } };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return apiHandler(req, async () => {
    const session = await requireRole("ADMIN");
    await unassignLecturer(params.id, session.userId);
    return noContent();
  });
}
