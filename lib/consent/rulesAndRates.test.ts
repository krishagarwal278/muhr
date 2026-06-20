import { describe, it, expect } from "vitest";
import {
  blockedCategoriesFromUsageToggles,
  usageTogglesFromBlockedCategories,
  rulesAndRatesFromRow,
  rowPatchFromRulesAndRates,
  rulesAndRatesFromApiJson,
  DEFAULT_RULES_AND_RATES,
} from "./rulesAndRates";

describe("blockedCategoriesFromUsageToggles", () => {
  it("blocks politics and alcohol/gambling when toggles are off", () => {
    expect(
      blockedCategoriesFromUsageToggles({
        allowPoliticalContent: false,
        allowAlcoholGambling: false,
      })
    ).toEqual(["politics", "alcohol", "gambling"]);
  });

  it("returns empty when both toggles are on", () => {
    expect(
      blockedCategoriesFromUsageToggles({
        allowPoliticalContent: true,
        allowAlcoholGambling: true,
      })
    ).toEqual([]);
  });
});

describe("usageTogglesFromBlockedCategories", () => {
  it("derives toggles from legacy blocked categories", () => {
    expect(usageTogglesFromBlockedCategories(["politics", "alcohol"])).toEqual({
      allowPoliticalContent: false,
      allowAlcoholGambling: false,
    });
  });
});

describe("rulesAndRatesFromRow", () => {
  it("returns defaults when row is null", () => {
    expect(rulesAndRatesFromRow(null)).toEqual(DEFAULT_RULES_AND_RATES);
  });

  it("maps snake_case row fields to payload", () => {
    const payload = rulesAndRatesFromRow({
      channels: ["instagram"],
      territories: ["IN"],
      blocked_categories: ["politics"],
      allow_voice_synthesis: true,
      allow_face_reenactment: false,
      require_approval_per_use: true,
      default_duration_days: 60,
      face_only_rate_inr: 180000,
      voice_face_rate_inr: 320000,
      voice_only_rate_inr: 120000,
      other_rate_inr: 95000,
      exclusivity_uplift_percent: 50,
      rate_period_days: 30,
      allow_paid_social: true,
      allow_broadcast: false,
      allow_political_content: false,
      allow_alcohol_gambling: true,
      allow_other: false,
      other_usage_notes: "Podcasts and internal training only.",
      require_exclusivity_opt_in: false,
    });

    expect(payload.channels).toEqual(["instagram"]);
    expect(payload.territories).toEqual(["India"]);
    expect(payload.faceOnlyRateInr).toBe(180000);
    expect(payload.otherRateInr).toBe(95000);
    expect(payload.exclusivityUpliftPercent).toBe(50);
    expect(payload.allowBroadcast).toBe(false);
    expect(payload.allowAlcoholGambling).toBe(true);
    expect(payload.allowOther).toBe(false);
    expect(payload.otherUsageNotes).toBe("Podcasts and internal training only.");
    expect(payload.requireExclusivityOptIn).toBe(false);
  });
});

describe("rowPatchFromRulesAndRates", () => {
  it("syncs blocked_categories from usage toggles", () => {
    const patch = rowPatchFromRulesAndRates({
      ...DEFAULT_RULES_AND_RATES,
      allowPoliticalContent: false,
      allowAlcoholGambling: false,
      faceOnlyRateInr: 150000,
    });

    expect(patch.blocked_categories).toEqual(["politics", "alcohol", "gambling"]);
    expect(patch.face_only_rate_inr).toBe(150000);
    expect(patch.allow_paid_social).toBe(true);
  });
});

describe("rulesAndRatesFromApiJson", () => {
  it("parses wrapped ok/data response", () => {
    const payload = rulesAndRatesFromApiJson({
      ok: true,
      data: {
        faceOnlyRateInr: 200000,
        otherRateInr: 100000,
        allowPoliticalContent: true,
        allowOther: false,
        requireExclusivityOptIn: false,
      },
    });

    expect(payload?.faceOnlyRateInr).toBe(200000);
    expect(payload?.otherRateInr).toBe(100000);
    expect(payload?.allowPoliticalContent).toBe(true);
    expect(payload?.allowOther).toBe(false);
    expect(payload?.requireExclusivityOptIn).toBe(false);
  });

  it("returns null for invalid json", () => {
    expect(rulesAndRatesFromApiJson(null)).toBeNull();
  });
});
