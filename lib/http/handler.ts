import type { NextRequest } from "next/server";
import { ZodType } from "zod";
import { NextResponse } from "next/server";
import { failure } from "@/lib/http/response";
import { validationFailed } from "@/lib/http/errors";
import { assertSameOrigin } from "@/lib/security/origin";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Next.js uses thrown errors as control-flow signals for dynamic rendering and
 * redirects. These must be re-thrown (not mapped to a 500) or the framework will
 * mis-classify a route as static.
 */
function isNextControlFlowError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return (
    digest === "DYNAMIC_SERVER_USAGE" ||
    digest === "NEXT_NOT_FOUND" ||
    digest === "NEXT_REDIRECT" ||
    (error instanceof Error && error.message.includes("Dynamic server usage"))
  );
}

/**
 * Request lifecycle wrapper for every route handler.
 *
 * Responsibilities (and nothing else):
 *  - CSRF origin check for mutating methods
 *  - uniform error mapping
 *  - guarantee a Response is always returned
 *
 * Authorisation is *not* implicit here: handlers call `requireRole()`/`getSession()`
 * explicitly so that a missing guard is visible during code review.
 */
export async function apiHandler(
  req: NextRequest,
  run: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    if (MUTATING.has(req.method)) {
      assertSameOrigin(req);
    }
    return await run();
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    return failure(error);
  }
}

/** Parse and validate a JSON request body, throwing a 400 with field errors. */
export async function parseJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw validationFailed([{ path: "", message: "Request body must be valid JSON" }]);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw validationFailed(
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

/** Validate a plain object (e.g. query params already coerced to a record). */
export function parseWith<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw validationFailed(
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  return result.data;
}
