import { describe, expect, it, beforeEach } from "vitest";

import {
  checkRateLimit,
  clearRateLimitBuckets,
} from "@/lib/security/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    clearRateLimitBuckets();
  });

  it("allows requests under the limit", () => {
    expect(checkRateLimit({ key: "a", limit: 2, windowMs: 60_000 })).toEqual({
      ok: true,
    });
    expect(checkRateLimit({ key: "a", limit: 2, windowMs: 60_000 })).toEqual({
      ok: true,
    });
  });

  it("blocks when limit is exceeded", () => {
    checkRateLimit({ key: "b", limit: 1, windowMs: 60_000 });
    const blocked = checkRateLimit({ key: "b", limit: 1, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("isolates keys", () => {
    checkRateLimit({ key: "c1", limit: 1, windowMs: 60_000 });
    expect(checkRateLimit({ key: "c2", limit: 1, windowMs: 60_000 })).toEqual({
      ok: true,
    });
  });
});
