import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "@/lib/http/errors";
import { env } from "@/lib/env";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** 200 OK with the standard success envelope. */
export function ok<T>(data: T, meta?: PaginationMeta): NextResponse {
  return NextResponse.json(meta ? { data, meta } : { data }, { status: 200 });
}

/** 201 Created. */
export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

/** 204 No Content. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Convert any thrown value into the standard error response.
 * Unknown errors become a generic 500 — internal messages are never exposed.
 */
export function failure(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    const body: ApiErrorBody = {
      error: { code: error.code, message: error.message },
    };
    if (error.details !== undefined) body.error.details = error.details;
    return NextResponse.json(body, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      } satisfies ApiErrorBody,
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Translate database constraint violations into meaningful API responses.
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta?.target as string[]).join(", ")
        : String(error.meta?.target ?? "field");
      return NextResponse.json(
        { error: { code: "CONFLICT", message: `A record with this ${target} already exists` } },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Resource not found" } },
        { status: 404 },
      );
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "This record is referenced by other data and cannot be modified or deleted",
          },
        },
        { status: 409 },
      );
    }
  }

  // Unexpected: log server-side, return an opaque message to the client.
  console.error("[api] unhandled error", error);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again.",
        ...(env.isProduction ? {} : { details: (error as Error)?.message }),
      },
    } satisfies ApiErrorBody,
    { status: 500 },
  );
}
