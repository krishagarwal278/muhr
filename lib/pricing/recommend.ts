/**
 * Pure, deterministic fee recommendation engine.
 *
 * No AI calls. No network. Given a creator anchor + license parameters, returns
 * a recommended INR range with a per-driver breakdown a human can read and audit.
 *
 * All tier constants live in `./tiers.ts` so we can tune the model without
 * touching the engine.
 */

import {
  ADDITIONAL_CHANNEL_UPLIFT,
  BASE_CHANNELS,
  DEFAULT_TIER_ID,
  DURATION_MULTIPLIERS,
  NON_GLOBAL_MULTIPLIER_CAP,
  PER_TERRITORY_UPLIFT,
  PREMIUM_CHANNELS,
  PREMIUM_CHANNEL_UPLIFT,
  PRICING_TIERS,
  RANGE_WIDTH_BY_TIER,
  ROUNDING_UNIT_INR,
  TERRITORY_BASE_INDIA,
  TERRITORY_GLOBAL,
  TERRITORY_GLOBAL_MULTIPLIER,
  tierFromFollowerCount,
  tierFromMinFeeInr,
  type PricingTier,
  type PricingTierId,
} from "./tiers";

export interface CreatorAnchor {
  /** Creator-stated floor for licensing fees, in INR. Strongest signal when present. */
  minLicenseFeeInr?: number | null;
  /** Optional follower count if/when we collect it. Falls back to minFeeInr-derived tier. */
  followerCount?: number | null;
  /** Allow the caller to force a specific tier (e.g. admin override). */
  forceTierId?: PricingTierId;
}

export interface LicenseParams {
  /** License duration in days. */
  durationDays: number;
  /** Selected channels (display labels — e.g. "Instagram", "TV / OTT"). */
  channels: string[];
  /** Selected territories (display labels — e.g. "India", "Global"). */
  territories: string[];
}

export type BreakdownKey =
  | "base"
  | "duration"
  | "channels"
  | "territories";

export interface BreakdownLine {
  key: BreakdownKey;
  label: string;
  /** For `base`, the INR amount; for others, the multiplier. */
  value: number;
  /** Multiplier expressed as `+X%` for non-base rows. Empty for `base`. */
  display: string;
  /** Short human-readable explanation. */
  detail: string;
}

export interface PricingRecommendation {
  /** Recommended tier label used as the anchor. */
  tier: PricingTier;
  /** How we picked the tier — for debugging / explainability. */
  tierSource: "force" | "follower_count" | "min_fee" | "default";
  /** The base anchor before any multipliers (₹). */
  baseInr: number;
  /** The midpoint recommended fee (₹), already rounded. */
  midInr: number;
  /** The fair-range bounds (₹), already rounded. */
  lowInr: number;
  highInr: number;
  /** Step-by-step breakdown rows in order. */
  breakdown: BreakdownLine[];
  /** Short rationale lines a brand can read. */
  rationale: string[];
  /** Caveats to surface in the UI (e.g. "estimate only", missing data). */
  caveats: string[];
}

function pickTier(anchor: CreatorAnchor): {
  tier: PricingTier;
  source: PricingRecommendation["tierSource"];
} {
  if (anchor.forceTierId && PRICING_TIERS[anchor.forceTierId]) {
    return { tier: PRICING_TIERS[anchor.forceTierId], source: "force" };
  }
  const fromFollowers = tierFromFollowerCount(anchor.followerCount);
  if (fromFollowers) return { tier: PRICING_TIERS[fromFollowers], source: "follower_count" };
  if (anchor.minLicenseFeeInr && anchor.minLicenseFeeInr > 0) {
    return { tier: PRICING_TIERS[tierFromMinFeeInr(anchor.minLicenseFeeInr)], source: "min_fee" };
  }
  return { tier: PRICING_TIERS[DEFAULT_TIER_ID], source: "default" };
}

/**
 * Compute the anchor base INR. If the creator has stated a minimum, we honour
 * it as the floor (their explicit signal beats the tier default). Otherwise we
 * use the tier's published base rate.
 */
function pickBaseInr(tier: PricingTier, anchor: CreatorAnchor): number {
  const stated = anchor.minLicenseFeeInr;
  if (typeof stated === "number" && stated > 0) {
    return Math.max(stated, tier.baseInr * 0.9);
  }
  return tier.baseInr;
}

/**
 * Linearly interpolate the duration multiplier from the anchor table for any
 * number of days. Clamps to the table edges to keep the curve sane.
 */
export function durationMultiplier(days: number): number {
  if (!Number.isFinite(days) || days <= 0) return 1;
  const table = DURATION_MULTIPLIERS;
  if (days <= table[0]!.days) return table[0]!.mult;
  if (days >= table[table.length - 1]!.days) return table[table.length - 1]!.mult;
  for (let i = 0; i < table.length - 1; i += 1) {
    const a = table[i]!;
    const b = table[i + 1]!;
    if (days >= a.days && days <= b.days) {
      const t = (days - a.days) / (b.days - a.days);
      return a.mult + t * (b.mult - a.mult);
    }
  }
  return 1;
}

function additionalChannelCount(channels: string[]): {
  premium: number;
  standard: number;
} {
  const unique = Array.from(
    new Set(channels.map((c) => c.trim()).filter((c) => c.length > 0))
  );
  let premium = 0;
  let standard = 0;
  for (const ch of unique) {
    if (BASE_CHANNELS.has(ch) || BASE_CHANNELS.has(ch.toLowerCase())) continue;
    if (PREMIUM_CHANNELS.has(ch) || PREMIUM_CHANNELS.has(ch.toLowerCase())) {
      premium += 1;
    } else {
      standard += 1;
    }
  }
  return { premium, standard };
}

export function channelMultiplier(channels: string[]): number {
  const { premium, standard } = additionalChannelCount(channels);
  return 1 + premium * PREMIUM_CHANNEL_UPLIFT + standard * ADDITIONAL_CHANNEL_UPLIFT;
}

export function territoryMultiplier(territories: string[]): number {
  const unique = Array.from(
    new Set(territories.map((t) => t.trim()).filter((t) => t.length > 0))
  );
  if (unique.length === 0) return 1;
  if (unique.includes(TERRITORY_GLOBAL)) return TERRITORY_GLOBAL_MULTIPLIER;
  const nonIndia = unique.filter((t) => t !== TERRITORY_BASE_INDIA).length;
  if (nonIndia === 0) return 1;
  const combined = 1 + nonIndia * PER_TERRITORY_UPLIFT;
  return Math.min(combined, NON_GLOBAL_MULTIPLIER_CAP);
}

function roundToUnit(value: number, unit: number = ROUNDING_UNIT_INR): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(unit, Math.round(value / unit) * unit);
}

function formatMultiplierDelta(mult: number): string {
  if (Math.abs(mult - 1) < 1e-6) return "no change";
  const pct = Math.round((mult - 1) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

function joinList(items: string[], conjunction: "and" | "or" = "and"): string {
  const filtered = items.filter((x) => x.length > 0);
  if (filtered.length === 0) return "";
  if (filtered.length === 1) return filtered[0]!;
  if (filtered.length === 2) return `${filtered[0]} ${conjunction} ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(", ")}, ${conjunction} ${filtered[filtered.length - 1]}`;
}

export function recommendFee(
  anchor: CreatorAnchor,
  params: LicenseParams
): PricingRecommendation {
  const { tier, source } = pickTier(anchor);
  const baseInr = pickBaseInr(tier, anchor);
  const dMult = durationMultiplier(params.durationDays);
  const cMult = channelMultiplier(params.channels);
  const tMult = territoryMultiplier(params.territories);

  const rawMid = baseInr * dMult * cMult * tMult;
  const rangeWidth = RANGE_WIDTH_BY_TIER[tier.id];
  const midInr = roundToUnit(rawMid);
  const lowInr = roundToUnit(rawMid * (1 - rangeWidth));
  const highInr = roundToUnit(rawMid * (1 + rangeWidth));

  const breakdown: BreakdownLine[] = [
    {
      key: "base",
      label: `Base rate (${tier.label})`,
      value: baseInr,
      display: "",
      detail:
        source === "min_fee"
          ? "Anchored on the creator’s stated minimum fee."
          : source === "follower_count"
            ? `Tier inferred from follower count (${tier.followerBand}).`
            : source === "force"
              ? "Tier selected by an operator override."
              : `Default tier (${tier.followerBand}). Will refine once the creator confirms their minimum fee.`,
    },
    {
      key: "duration",
      label: `Duration: ${params.durationDays} day${params.durationDays === 1 ? "" : "s"}`,
      value: dMult,
      display: formatMultiplierDelta(dMult),
      detail:
        params.durationDays <= 30
          ? "Short engagement, baseline duration."
          : params.durationDays >= 180
            ? "Long-duration commitment — discounted vs. linear extrapolation."
            : "Standard mid-duration uplift.",
    },
    {
      key: "channels",
      label:
        params.channels.length === 0
          ? "Channels: none selected"
          : `Channels: ${joinList(params.channels)}`,
      value: cMult,
      display: formatMultiplierDelta(cMult),
      detail: (() => {
        const { premium, standard } = additionalChannelCount(params.channels);
        if (premium === 0 && standard === 0) {
          return "Instagram/Facebook only — no per-channel uplift.";
        }
        const parts: string[] = [];
        if (standard > 0) parts.push(`${standard} additional channel${standard === 1 ? "" : "s"}`);
        if (premium > 0)
          parts.push(`${premium} premium / broadcast channel${premium === 1 ? "" : "s"}`);
        return `${joinList(parts)} added on top of the base pair.`;
      })(),
    },
    {
      key: "territories",
      label:
        params.territories.length === 0
          ? "Territories: none selected"
          : `Territories: ${joinList(params.territories)}`,
      value: tMult,
      display: formatMultiplierDelta(tMult),
      detail:
        params.territories.includes(TERRITORY_GLOBAL)
          ? "Global rights carry the largest territory premium."
          : params.territories.length === 0 || (params.territories.length === 1 && params.territories[0] === TERRITORY_BASE_INDIA)
            ? "India only — baseline territory."
            : "Additional non-India territories add a per-region uplift.",
    },
  ];

  const rationale = buildRationale(tier, params, dMult, cMult, tMult, source);
  const caveats = buildCaveats(anchor, source);

  return {
    tier,
    tierSource: source,
    baseInr,
    midInr,
    lowInr,
    highInr,
    breakdown,
    rationale,
    caveats,
  };
}

function buildRationale(
  tier: PricingTier,
  params: LicenseParams,
  dMult: number,
  cMult: number,
  tMult: number,
  source: PricingRecommendation["tierSource"]
): string[] {
  const lines: string[] = [];
  if (source === "min_fee") {
    lines.push(
      `Anchored on this creator’s stated minimum fee; range is the multiplier stack applied to that floor.`
    );
  } else if (source === "follower_count") {
    lines.push(
      `Anchored on a typical ${tier.label.toLowerCase()} rate (${tier.followerBand}).`
    );
  } else {
    lines.push(
      `No creator-stated minimum yet — using ${tier.label.toLowerCase()} as a placeholder anchor.`
    );
  }

  if (dMult >= 4) {
    lines.push(`Long duration (${params.durationDays} days) is the dominant uplift here.`);
  } else if (dMult > 1.1) {
    lines.push(`Duration (${params.durationDays} days) adds ${formatMultiplierDelta(dMult)}.`);
  }

  if (cMult > 1.2) {
    const { premium, standard } = additionalChannelCount(params.channels);
    if (premium > 0) {
      lines.push(`Premium channels (e.g. TV / OTT) drive most of the channel uplift.`);
    } else if (standard > 0) {
      lines.push(`Each additional channel beyond Instagram + Facebook adds incremental value.`);
    }
  }

  if (params.territories.includes(TERRITORY_GLOBAL)) {
    lines.push("Global usage rights significantly expand the addressable audience.");
  } else if (tMult > 1.1) {
    lines.push("Multi-territory rights add meaningful value beyond an India-only buy.");
  }

  return lines;
}

function buildCaveats(
  anchor: CreatorAnchor,
  source: PricingRecommendation["tierSource"]
): string[] {
  const caveats: string[] = [
    "Estimate only — not a guaranteed market rate or Muhr-set price.",
    "Calibrated for AI-native production budgets in India; widely recognizable likeness can justify higher fees.",
  ];
  if (source === "default") {
    caveats.push(
      "Will refine once the creator sets a minimum fee or we capture follower data."
    );
  } else if (source === "min_fee" && (anchor.minLicenseFeeInr ?? 0) > 0) {
    caveats.push(
      `Floor is set by the creator (₹${(anchor.minLicenseFeeInr ?? 0).toLocaleString("en-IN")}).`
    );
  }
  return caveats;
}
