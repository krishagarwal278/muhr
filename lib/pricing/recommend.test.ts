import { describe, expect, it } from "vitest";
import {
  channelMultiplier,
  durationMultiplier,
  recommendFee,
  territoryMultiplier,
} from "./recommend";
import { PRICING_TIERS, tierFromFollowerCount, tierFromMinFeeInr } from "./tiers";

describe("tierFromMinFeeInr", () => {
  it("returns established when no minimum is set", () => {
    expect(tierFromMinFeeInr(null)).toBe("established");
    expect(tierFromMinFeeInr(0)).toBe("established");
  });

  it("buckets common min-fee values into the right tier", () => {
    expect(tierFromMinFeeInr(8_000)).toBe("emerging");
    expect(tierFromMinFeeInr(12_000)).toBe("rising");
    expect(tierFromMinFeeInr(20_000)).toBe("established");
    expect(tierFromMinFeeInr(45_000)).toBe("mid_tier");
    expect(tierFromMinFeeInr(70_000)).toBe("growing");
    expect(tierFromMinFeeInr(1_00_000)).toBe("major");
    expect(tierFromMinFeeInr(1_50_000)).toBe("notable");
    expect(tierFromMinFeeInr(2_50_000)).toBe("top_tier");
  });
});

describe("tierFromFollowerCount", () => {
  it("returns null for missing follower data", () => {
    expect(tierFromFollowerCount(null)).toBeNull();
    expect(tierFromFollowerCount(0)).toBeNull();
  });

  it("buckets common follower counts into the right tier", () => {
    expect(tierFromFollowerCount(20_000)).toBe("emerging");
    expect(tierFromFollowerCount(35_000)).toBe("rising");
    expect(tierFromFollowerCount(75_000)).toBe("established");
    expect(tierFromFollowerCount(150_000)).toBe("mid_tier");
    expect(tierFromFollowerCount(300_000)).toBe("growing");
    expect(tierFromFollowerCount(600_000)).toBe("major");
    expect(tierFromFollowerCount(1_000_000)).toBe("notable");
    expect(tierFromFollowerCount(2_000_000)).toBe("top_tier");
  });
});

describe("durationMultiplier", () => {
  it("returns 1.0 for the 30-day baseline", () => {
    expect(durationMultiplier(30)).toBeCloseTo(1.0, 5);
  });

  it("is monotonically non-decreasing in days", () => {
    const samples = [7, 14, 30, 45, 60, 75, 90, 120, 180, 270, 365];
    let prev = 0;
    for (const d of samples) {
      const m = durationMultiplier(d);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });

  it("interpolates between anchor points (45 days lies between 30 and 60)", () => {
    const m45 = durationMultiplier(45);
    expect(m45).toBeGreaterThan(1.0);
    expect(m45).toBeLessThan(1.75);
  });

  it("clamps below the lowest anchor and above the highest", () => {
    expect(durationMultiplier(1)).toBeCloseTo(0.45, 5);
    expect(durationMultiplier(10_000)).toBeCloseTo(6.5, 5);
  });

  it("handles invalid input gracefully", () => {
    expect(durationMultiplier(0)).toBe(1);
    expect(durationMultiplier(-5)).toBe(1);
    expect(durationMultiplier(Number.NaN)).toBe(1);
  });
});

describe("channelMultiplier", () => {
  it("returns 1.0 for the base pair only", () => {
    expect(channelMultiplier(["Instagram", "Facebook"])).toBe(1);
  });

  it("returns 1.0 for the empty list (no channel implies baseline)", () => {
    expect(channelMultiplier([])).toBe(1);
  });

  it("adds a standard uplift per non-base channel", () => {
    const single = channelMultiplier(["Instagram", "YouTube"]);
    const two = channelMultiplier(["Instagram", "YouTube", "LinkedIn"]);
    expect(single).toBeGreaterThan(1);
    expect(two).toBeGreaterThan(single);
  });

  it("charges premium channels (TV / OTT) more than standard channels", () => {
    const standard = channelMultiplier(["Instagram", "YouTube"]);
    const premium = channelMultiplier(["Instagram", "TV / OTT"]);
    expect(premium).toBeGreaterThan(standard);
  });

  it("ignores duplicate channels", () => {
    expect(channelMultiplier(["Instagram", "Instagram", "Facebook"])).toBe(1);
  });
});

describe("territoryMultiplier", () => {
  it("returns 1.0 for India-only or empty", () => {
    expect(territoryMultiplier(["India"])).toBe(1);
    expect(territoryMultiplier([])).toBe(1);
  });

  it("Global beats any combination of non-India territories", () => {
    const combined = territoryMultiplier(["India", "United States", "United Kingdom", "UAE"]);
    const global = territoryMultiplier(["Global"]);
    expect(global).toBeGreaterThan(combined);
  });

  it("uplift grows with additional territories but is capped below Global", () => {
    const one = territoryMultiplier(["India", "United States"]);
    const two = territoryMultiplier(["India", "United States", "United Kingdom"]);
    const global = territoryMultiplier(["Global"]);
    expect(two).toBeGreaterThan(one);
    expect(two).toBeLessThan(global);
  });

  it("ignores duplicate territories", () => {
    const a = territoryMultiplier(["India", "United States"]);
    const b = territoryMultiplier(["India", "United States", "United States"]);
    expect(a).toBe(b);
  });
});

describe("recommendFee", () => {
  it("returns a positive, rounded range for a simple India-only Instagram-Facebook 30d ask", () => {
    const r = recommendFee(
      { minLicenseFeeInr: 50_000 },
      { durationDays: 30, channels: ["Instagram", "Facebook"], territories: ["India"] }
    );
    expect(r.midInr).toBeGreaterThan(0);
    expect(r.lowInr).toBeLessThan(r.midInr);
    expect(r.highInr).toBeGreaterThan(r.midInr);
    expect(r.midInr % 1000).toBe(0);
    expect(r.lowInr % 1000).toBe(0);
    expect(r.highInr % 1000).toBe(0);
  });

  it("respects creator's stated minimum as the floor", () => {
    const r = recommendFee(
      { minLicenseFeeInr: 1_00_000 },
      { durationDays: 30, channels: ["Instagram", "Facebook"], territories: ["India"] }
    );
    expect(r.midInr).toBeGreaterThanOrEqual(90_000);
    expect(r.tierSource).toBe("min_fee");
  });

  it("falls back to default tier when no anchor is provided", () => {
    const r = recommendFee(
      {},
      { durationDays: 30, channels: ["Instagram", "Facebook"], territories: ["India"] }
    );
    expect(r.tierSource).toBe("default");
    expect(r.tier.id).toBe("established");
    expect(r.baseInr).toBe(PRICING_TIERS.established.baseInr);
    expect(r.caveats.some((c) => c.toLowerCase().includes("estimate"))).toBe(true);
  });

  it("prefers follower count over min fee when both are present", () => {
    const r = recommendFee(
      { minLicenseFeeInr: 20_000, followerCount: 2_000_000 },
      { durationDays: 30, channels: ["Instagram", "Facebook"], territories: ["India"] }
    );
    expect(r.tierSource).toBe("follower_count");
    expect(r.tier.id).toBe("top_tier");
  });

  it("recommends meaningfully more for global + multi-channel + long duration", () => {
    const minimal = recommendFee(
      { minLicenseFeeInr: 50_000 },
      { durationDays: 30, channels: ["Instagram", "Facebook"], territories: ["India"] }
    );
    const maximal = recommendFee(
      { minLicenseFeeInr: 50_000 },
      {
        durationDays: 365,
        channels: ["Instagram", "Facebook", "YouTube", "TV / OTT"],
        territories: ["Global"],
      }
    );
    expect(maximal.midInr).toBeGreaterThan(minimal.midInr * 5);
  });

  it("forceTierId overrides all other signals", () => {
    const r = recommendFee(
      { minLicenseFeeInr: 5_000, forceTierId: "top_tier" },
      { durationDays: 30, channels: ["Instagram", "Facebook"], territories: ["India"] }
    );
    expect(r.tierSource).toBe("force");
    expect(r.tier.id).toBe("top_tier");
  });

  it("always returns rationale and caveats arrays (never undefined)", () => {
    const r = recommendFee(
      {},
      { durationDays: 90, channels: [], territories: [] }
    );
    expect(Array.isArray(r.rationale)).toBe(true);
    expect(Array.isArray(r.caveats)).toBe(true);
    expect(r.caveats[0]).toContain("Estimate only");
  });

  it("breakdown rows are present and ordered", () => {
    const r = recommendFee(
      { minLicenseFeeInr: 50_000 },
      { durationDays: 60, channels: ["Instagram", "YouTube"], territories: ["India", "United States"] }
    );
    const keys = r.breakdown.map((row) => row.key);
    expect(keys).toEqual(["base", "duration", "channels", "territories"]);
  });
});
