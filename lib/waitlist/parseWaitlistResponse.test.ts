import { describe, expect, it } from "vitest";
import { parseWaitlistResponse } from "./parseWaitlistResponse";

describe("parseWaitlistResponse", () => {
  it("reads ok/data envelope from POST /api/waitlist", () => {
    expect(
      parseWaitlistResponse(
        {
          ok: true,
          data: { message: "Almost there — tell us a bit more about you.", needsDetails: true },
        },
        true
      )
    ).toEqual({
      success: true,
      message: "Almost there — tell us a bit more about you.",
      needsDetails: true,
    });
  });

  it("reads error envelope", () => {
    expect(
      parseWaitlistResponse(
        { ok: false, error: { code: "conflict", message: "This email is already on the waitlist." } },
        false
      )
    ).toEqual({
      success: false,
      message: "This email is already on the waitlist.",
      code: "conflict",
    });
  });
});
