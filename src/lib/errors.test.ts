import { describe, expect, it } from "vitest";

import { getUserFriendlyError } from "@/lib/errors";

describe("getUserFriendlyError", () => {
  it("hides postgres internals", () => {
    expect(getUserFriendlyError(new Error("postgres connection failed"))).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("maps rate limit messages", () => {
    expect(getUserFriendlyError("Too many requests / rate limit")).toMatch(
      /too many/i,
    );
  });

  it("maps missing AMVS function to setup hint", () => {
    expect(
      getUserFriendlyError("Could not find the function public.AMVS_Foo"),
    ).toMatch(/SETUP_ALL/i);
  });

  it("passes short safe messages", () => {
    expect(getUserFriendlyError("Invalid username or password.")).toBe(
      "Invalid username or password.",
    );
  });
});
