import { describe, expect, it } from "vitest";

import { formatAuthCallbackError } from "./authCallbackMessages";

describe("formatAuthCallbackError", () => {
  it("maps rate_limited", () => {
    expect(formatAuthCallbackError("rate_limited", null)).toContain("wait");
  });

  it("maps auth_failed", () => {
    expect(formatAuthCallbackError("auth_failed", null)).toContain("sign");
  });

  it("uses generic for unknown errors", () => {
    expect(formatAuthCallbackError("unknown_oauth", null)).toContain("Something went wrong");
  });
});
