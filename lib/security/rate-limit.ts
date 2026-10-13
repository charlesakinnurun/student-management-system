import { tooManyRequests } from "@/lib/http/errors";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window in-memory rate limiter.
 *
 * Suitable for single-instance deployments. In a multi-instance setup replace
 * the Map with a shared store (Redis/Upstash) — see docs/ARCHITECTURE.md [D-6].
 */
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map cannot grow unbounded.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitConfig {
  /** Unique key, e.g. `login:1.2.3.4`. */
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;
  return { allowed, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
}

/** Throwing variant for use in route handlers. */
export function enforceRateLimit(config: RateLimitConfig): void {
  const result = checkRateLimit(config);
  if (!result.allowed) throw tooManyRequests();
}

/** Test helper — clears all buckets. */
export function resetRateLimits(): void {
  buckets.clear();
}
