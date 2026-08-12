import { describe, expect, it } from "vitest";

import { calculateMatchScore } from "@/lib/services/match-score";

describe("calculateMatchScore", () => {
  it("returns 0 when no preferences are active", () => {
    const result = calculateMatchScore({}, { UserId: "u1", Age: 30 });
    expect(result.matchScore).toBe(0);
    expect(result.hasActivePreferences).toBe(false);
  });

  it("scores age preference matches", () => {
    const result = calculateMatchScore(
      { MinAge: 25, MaxAge: 35 },
      { UserId: "u1", Age: 30 },
    );
    expect(result.hasActivePreferences).toBe(true);
    expect(result.matchScore).toBe(100);
    expect(result.matchedPreferences.some((d) => d.key === "age")).toBe(true);
  });

  it("penalizes age outside range", () => {
    const result = calculateMatchScore(
      { MinAge: 25, MaxAge: 35 },
      { UserId: "u1", Age: 45 },
    );
    expect(result.matchScore).toBe(0);
    expect(result.unmatchedPreferences.some((d) => d.key === "age")).toBe(true);
  });

  it("skips horoscope when unset", () => {
    const result = calculateMatchScore(
      { MinAge: 20, MaxAge: 40 },
      { UserId: "u1", Age: 28, HoroscopeAvailable: false },
    );
    expect(
      result.skippedPreferences.some((d) => d.key === "horoscope"),
    ).toBe(true);
  });
});
