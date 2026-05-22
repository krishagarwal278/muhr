import { describe, expect, it } from "vitest";
import { parseCounterOfferPayload, parseJoinedLicenseRequest } from "./counterOffer";

describe("parseCounterOfferPayload", () => {
  it("accepts valid payload", () => {
    const r = parseCounterOfferPayload({
      channels: ["Instagram", "Facebook"],
      territories: ["India"],
      durationDays: 30,
      proposedBudgetInr: 50_000,
      note: "  hello  ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.channels).toEqual(["Instagram", "Facebook"]);
      expect(r.payload.durationDays).toBe(30);
      expect(r.payload.proposedBudgetInr).toBe(50_000);
      expect(r.payload.note).toBe("hello");
    }
  });

  it("rejects empty channels", () => {
    const r = parseCounterOfferPayload({
      channels: [],
      territories: ["India"],
      durationDays: 30,
      proposedBudgetInr: 1,
    });
    expect(r.ok).toBe(false);
  });

  it("parses string duration from JSON forms", () => {
    const r = parseCounterOfferPayload({
      channels: ["Instagram"],
      territories: ["India"],
      durationDays: "45",
      proposedBudgetInr: 10_000,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.durationDays).toBe(45);
  });
});

describe("parseJoinedLicenseRequest", () => {
  it("parses object join", () => {
    const r = parseJoinedLicenseRequest({
      id: "abc",
      brand_email: "Brand@Example.com",
      status: "pending",
      creator_id: "creator-1",
    });
    expect(r?.id).toBe("abc");
    expect(r?.brand_email).toBe("Brand@Example.com");
  });

  it("parses array join", () => {
    const r = parseJoinedLicenseRequest([
      { id: "x", brand_email: "a@b.com", status: "pending", creator_id: "c" },
    ]);
    expect(r?.id).toBe("x");
  });
});
