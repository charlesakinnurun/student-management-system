import type { NextRequest } from "next/server";
import { forbidden } from "@/lib/http/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for cookie-authenticated mutations.
 *
 * SameSite=Lax already prevents cookies from being attached to cross-site
 * mutating requests in modern browsers; this is defence-in-depth. Non-browser
 * clients (tests, curl, server-to-server) legitimately omit `Origin`, so a
 * missing header is allowed — a *present but mismatched* Origin is rejected.
 */
export function assertSameOrigin(req: NextRequest): void {
  if (SAFE_METHODS.has(req.method)) return;

  const origin = req.headers.get("origin");
  if (!origin) return;

  const host = req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden("Invalid request origin");
  }

  if (!host || originHost !== host) {
    throw forbidden("Cross-site requests are not allowed");
  }
}
