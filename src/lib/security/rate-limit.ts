/**
 * Simple in-memory rate limiter for auth endpoints.
 * Suitable for single-instance deployments; use Redis for multi-instance prod.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(options.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return { ok: true };
  }

  if (existing.count >= options.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  buckets.set(options.key, existing);
  return { ok: true };
}

/** Test helper */
export function clearRateLimitBuckets() {
  buckets.clear();
}
