import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Liveness/readiness probe: confirms the process is up and the DB responds. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ data: { status: "ok", database: "up" } });
  } catch {
    return NextResponse.json({ error: { code: "UNHEALTHY", message: "Database unavailable" } }, { status: 503 });
  }
}
