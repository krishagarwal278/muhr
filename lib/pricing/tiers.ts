/**
 * Pricing tier and multiplier tables for the fee recommendation engine.
 *
 * **All numbers here are illustrative starting points.** They are *not* a guaranteed
 * market rate — change them as we collect real comp data from Muhr deals. Every value
 * a brand sees is labelled as an "estimate" in the UI.
 *
 * Currency: INR. All amounts are integers (paise-precision is irrelevant at this
 * tier of pricing; we round to the nearest ₹1,000 in the engine).
 *
 * Channels treated as "base" pair (no surcharge): Instagram + Facebook. Anything
 * else applies a per-channel uplift, with TV/OTT carrying a larger premium because
 * it usually implies broadcast clearance and higher reach.
 *
 * **Calibration (May 2026):** Five follower bands and base anchors align with the
 * internal Pricing sheet (typical mid reel per tier). `baseInr` is the 30-day,
 * India-only, Instagram+Facebook likeness-license anchor — brands still pay more for
 * longer terms, extra channels, or global territory; creators can set a higher minimum.
 */

export type PricingTierId =
  | "nano"
  | "late_micro"
  | "mid"
  | "macro"
  | "mega";

export interface PricingTier {
  id: PricingTierId;
  label: string;
  /** Indian creator-economy follower band (internal Pricing sheet). */
  followerBand: string;
  /** Anchor base rate (₹) for a 30-day license, two base channels, India only. */
  baseInr: number;
  /** Short tagline shown next to the tier label. */
  description: string;
  /** Reference comparables a brand will recognise. */
  comparables: string[];
}

export const PRICING_TIERS: Record<PricingTierId, PricingTier> = {
  nano: {
    id: "nano",
    label: "Nano & early micro",
    followerBand: "Under 50K followers",
    baseInr: 12_000,
    description: "Niche audience with strong authenticity; typical reel deals in the low thousands to mid tens of thousands.",
    comparables: [
      "Typical reel: ₹2,000 – ₹35,000",
      "Bundle (1 reel + 2 stories + 1 post): ₹8,000 – ₹60,000",
    ],
  },
  late_micro: {
    id: "late_micro",
    label: "Late micro",
    followerBand: "50K – 100K followers",
    baseInr: 45_000,
    description: "Proven micro-influencer with consistent engagement and prior brand work.",
    comparables: [
      "Typical reel: ₹25,000 – ₹85,000",
      "Bundle: ₹50,000 – ₹1,50,000",
    ],
  },
  mid: {
    id: "mid",
    label: "Mid-tier creator",
    followerBand: "100K – 500K followers",
    baseInr: 175_000,
    description: "Recognised creator with professional content and substantial reach.",
    comparables: [
      "Typical reel: ₹75,000 – ₹4,50,000",
      "Bundle: ₹1,50,000 – ₹5,00,000",
    ],
  },
  macro: {
    id: "macro",
    label: "Macro creator",
    followerBand: "500K – 1M followers",
    baseInr: 450_000,
    description: "Major digital personality with mass reach and high brand-association value.",
    comparables: [
      "Typical reel: ₹2,50,000 – ₹8,50,000",
      "Bundle: ₹4,00,000 – ₹12,00,000",
    ],
  },
  mega: {
    id: "mega",
    label: "Mega / celebrity",
    followerBand: "1M+ followers",
    baseInr: 1_200_000,
    description: "National or celebrity reach; likeness licensing carries significant reputational weight.",
    comparables: [
      "Typical reel: ₹6,00,000 – ₹50,00,000+",
      "Bundle: ₹10,00,000 – ₹75,00,000+",
    ],
  },
};

export const PRICING_TIER_ORDER: PricingTierId[] = [
  "nano",
  "late_micro",
  "mid",
  "macro",
  "mega",
];

/**
 * Default tier when we have no other signal (no creator-stated minimum, no
 * follower count). Late micro is a sensible middle for an unknown creator.
 */
export const DEFAULT_TIER_ID: PricingTierId = "late_micro";

/** Channels charged at the base rate; no per-channel surcharge. */
export const BASE_CHANNELS = new Set(
  ["Instagram", "Facebook", "instagram", "facebook"]
);

/**
 * Channels that carry a *larger* uplift than a standard additional channel
 * (broadcast / regulated, more clearance work).
 */
export const PREMIUM_CHANNELS = new Set([
  "TV / OTT",
  "Print",
  "Digital Ads",
  "tv",
  "ott",
  "print",
  "digital_ads",
]);

/** Multiplier applied per standard additional channel beyond the base pair. */
export const ADDITIONAL_CHANNEL_UPLIFT = 0.18;
/** Multiplier applied per premium channel beyond the base pair. */
export const PREMIUM_CHANNEL_UPLIFT = 0.35;

/**
 * Duration multipliers. Keys are days. Values are multipliers vs. the 30-day
 * baseline. Notice the discount for commitment: 365 is not 12× — it's ~6.5×.
 * For custom durations we linearly interpolate between the two closest anchors.
 */
export const DURATION_MULTIPLIERS: Array<{ days: number; mult: number }> = [
  { days: 7, mult: 0.45 },
  { days: 14, mult: 0.7 },
  { days: 30, mult: 1.0 },
  { days: 60, mult: 1.75 },
  { days: 90, mult: 2.4 },
  { days: 180, mult: 4.0 },
  { days: 365, mult: 6.5 },
];

/**
 * Territory multipliers. We treat "Global" as a single mode; combining specific
 * non-IN territories adds up but caps below Global.
 */
export const TERRITORY_BASE_INDIA = "India";
export const TERRITORY_GLOBAL = "Global";
export const TERRITORY_GLOBAL_MULTIPLIER = 1.8;
/** Adds per additional non-India, non-Global territory. */
export const PER_TERRITORY_UPLIFT = 0.22;
/** Cap on combined non-Global territory uplift (still below TERRITORY_GLOBAL_MULTIPLIER). */
export const NON_GLOBAL_MULTIPLIER_CAP = 1.65;

/**
 * Range width around the midpoint. The engine returns `{ low, mid, high }`
 * where low = mid * (1 - RANGE_WIDTH) and high = mid * (1 + RANGE_WIDTH).
 * Wider for nano (broad market spread); wider for mega where deals vary by fame.
 */
export const RANGE_WIDTH_BY_TIER: Record<PricingTierId, number> = {
  nano: 0.4,
  late_micro: 0.35,
  mid: 0.38,
  macro: 0.35,
  mega: 0.45,
};

/** Round recommended amounts to the nearest multiple of this (₹). */
export const ROUNDING_UNIT_INR = 1_000;

/** Classify a creator's self-stated minimum fee into a tier. */
export function tierFromMinFeeInr(minFeeInr: number | null | undefined): PricingTierId {
  if (!minFeeInr || minFeeInr <= 0) return DEFAULT_TIER_ID;
  if (minFeeInr < 28_000) return "nano";
  if (minFeeInr < 110_000) return "late_micro";
  if (minFeeInr < 312_000) return "mid";
  if (minFeeInr < 825_000) return "macro";
  return "mega";
}

/**
 * Classify a creator by follower count (internal Pricing sheet bands).
 */
export function tierFromFollowerCount(followers: number | null | undefined): PricingTierId | null {
  if (!followers || followers <= 0) return null;
  if (followers >= 1_000_000) return "mega";
  if (followers >= 500_000) return "macro";
  if (followers >= 100_000) return "mid";
  if (followers >= 50_000) return "late_micro";
  return "nano";
}
