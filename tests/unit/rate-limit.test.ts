import { afterEach, describe, expect, it } from "vitest";
import { checkRateLimit, enforceRateLimit, resetRateLimits } from "@/lib/security/rate-limit";
import { HttpError } from "@/lib/http/errors";

afterEach(() => resetRateLimits());

describe("checkRateLimit", () => {
  it("allows requests up to the limit then blocks", () => {
    const config = { key: "test", limit: 3, windowMs: 60_000 };
    expect(checkRateLimit(config).allowed).toBe(true);
    expect(checkRateLimit(config).allowed).toBe(true);
    const third = checkRateLimit(config);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
    expect(checkRateLimit(config).allowed).toBe(false);
  });

  it("tracks separate keys independently", () => {
    expect(checkRateLimit({ key: "a", limit: 1, windowMs: 60_000 }).allowed).toBe(true);
    expect(checkRateLimit({ key: "b", limit: 1, windowMs: 60_000 }).allowed).toBe(true);
    expect(checkRateLimit({ key: "a", limit: 1, windowMs: 60_000 }).allowed).toBe(false);
  });

  it("resets once the window elapses", () => {
    const config = { key: "window", limit: 1, windowMs: -1 };
    expect(checkRateLimit(config).allowed).toBe(true);
    // A negative window is already expired, so the next call starts a new window.
    expect(checkRateLimit(config).allowed).toBe(true);
  });
});

describe("enforceRateLimit", () => {
  it("throws a 429 HttpError when the limit is exceeded", () => {
    enforceRateLimit({ key: "throw", limit: 1, windowMs: 60_000 });
    expect(() => enforceRateLimit({ key: "throw", limit: 1, windowMs: 60_000 })).toThrowError(HttpError);
    try {
      enforceRateLimit({ key: "throw", limit: 1, windowMs: 60_000 });
    } catch (error) {
      expect((error as HttpError).status).toBe(429);
    }
  });
});
