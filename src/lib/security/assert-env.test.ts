import { afterEach, describe, expect, it } from "vitest";

import { assertServiceRoleNotPublic } from "@/lib/security/assert-env";

describe("assertServiceRoleNotPublic", () => {
  const original = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in original)) delete process.env[key];
    }
    Object.assign(process.env, original);
  });

  it("passes when public env is clean", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    expect(() => assertServiceRoleNotPublic()).not.toThrow();
  });

  it("throws when service role leaks into NEXT_PUBLIC_*", () => {
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY = "secret";
    expect(() => assertServiceRoleNotPublic()).toThrow(/service role/i);
  });
});
