/**
 * Typed HTTP error hierarchy. Services throw these; the central failure mapper
 * converts them into the standard error envelope. Anything that is *not* an
 * HttpError is treated as an unexpected 500 and never leaks its message.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message = "Bad request", details?: unknown) =>
  new HttpError(400, "BAD_REQUEST", message, details);

export const validationFailed = (details: unknown, message = "Validation failed") =>
  new HttpError(400, "VALIDATION_ERROR", message, details);

export const unauthorized = (message = "Authentication required") =>
  new HttpError(401, "UNAUTHENTICATED", message);

export const forbidden = (message = "You do not have permission to perform this action") =>
  new HttpError(403, "FORBIDDEN", message);

export const notFound = (message = "Resource not found") =>
  new HttpError(404, "NOT_FOUND", message);

export const conflict = (message = "Resource already exists", details?: unknown) =>
  new HttpError(409, "CONFLICT", message, details);

export const unprocessable = (message = "The request violates a business rule", details?: unknown) =>
  new HttpError(422, "BUSINESS_RULE_VIOLATION", message, details);

export const tooManyRequests = (message = "Too many requests, please slow down") =>
  new HttpError(429, "RATE_LIMITED", message);
