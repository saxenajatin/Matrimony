import { describe, expect, it } from "vitest";

import { parseDiscoverSearchParams } from "@/lib/validations/discover";

describe("parseDiscoverSearchParams", () => {
  it("defaults page to 1", () => {
    expect(parseDiscoverSearchParams({}).page).toBe(1);
  });

  it("parses filters and swaps inverted age range", () => {
    const filters = parseDiscoverSearchParams({
      gender: "Female",
      ageMin: "40",
      ageMax: "25",
      verifiedOnly: "1",
      page: "2",
    });
    expect(filters.gender).toBe("Female");
    expect(filters.ageMin).toBe(25);
    expect(filters.ageMax).toBe(40);
    expect(filters.verifiedOnly).toBe(true);
    expect(filters.page).toBe(2);
  });

  it("ignores invalid numbers", () => {
    const filters = parseDiscoverSearchParams({
      ageMin: "abc",
      page: "0",
    });
    expect(filters.ageMin).toBeUndefined();
    expect(filters.page).toBe(1);
  });
});
