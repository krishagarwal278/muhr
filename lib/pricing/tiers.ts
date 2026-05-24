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
 * **Calibration (May 2026):** Base tier anchors are set ~30% below our first-pass
 * tables so estimates sit closer to AI-native production economics in India (e.g.
 * full short-form series delivered in the low lakhs). Brands still pay more for
 * highly recognizable likeness; creators can always set a higher minimum fee.
 */

export type PricingTierId =
  | "emerging"
  | "rising"
  | "established"
  | "mid_tier"
  | "growing"
  | "major"
  | "notable"
  | "top_tier";

export interface PricingTier {
  id: PricingTierId;
  label: string;
  /** Loosely indexed to Indian creator-economy follower bands. */
  followerBand: string;
  /** Anchor base rate (₹) for a 30-day license, two base channels, India only. */
  baseInr: number;
  /** Short tagline shown next to the tier label. */
  description: string;
  /** Reference comparables a brand will recognise. */
  comparables: string[];
}

export const PRICING_TIERS: Record<PricingTierId, PricingTier> = {
  emerging: {
    id: "emerging",
    label: "Emerging creator",
    followerBand: "Under 30K followers",
    baseInr: 7_000,
    description: "Growing audience with strong authenticity in a niche community.",
    comparables: [
      "Comparable to user-generated content campaigns",
      "Higher trust per impression than paid social",
    ],
  },
  rising: {
    id: "rising",
    label: "Rising creator",
    followerBand: "30K–50K followers",
    baseInr: 12_000,
    description: "Building momentum with consistent engagement and growing reach.",
    comparables: [
      "Comparable to niche micro-influencer campaigns",
      "Strong community engagement metrics",
    ],
  },
  established: {
    id: "established",
    label: "Established creator",
    followerBand: "50K–100K followers",
    baseInr: 19_000,
    description: "Proven track record with engaged followers and prior brand work.",
    comparables: [
      "Standard micro-influencer rates in India",
      "Comparable to targeted digital ad campaigns",
    ],
  },
  mid_tier: {
    id: "mid_tier",
    label: "Mid-tier creator",
    followerBand: "100K–250K followers",
    baseInr: 38_000,
    description: "Recognised name with professional-grade content and significant reach.",
    comparables: [
      "Comparable to regional print and out-of-home placements",
      "Standard for professional influencer campaigns",
    ],
  },
  growing: {
    id: "growing",
    label: "Growing creator",
    followerBand: "250K–500K followers",
    baseInr: 65_000,
    description: "Substantial audience with strong brand partnership potential.",
    comparables: [
      "Comparable to regional digital campaigns",
      "Mid-range influencer marketing rates",
    ],
  },
  major: {
    id: "major",
    label: "Major creator",
    followerBand: "500K–800K followers",
    baseInr: 100_000,
    description: "Major digital personality with mass reach and brand-association value.",
    comparables: [
      "Comparable to regional TV spots and metro billboards",
      "Higher than typical influencer-marketing averages",
    ],
  },
  notable: {
    id: "notable",
    label: "Notable creator",
    followerBand: "800K–1.3M followers",
    baseInr: 160_000,
    description: "High-profile creator with significant cultural influence.",
    comparables: [
      "Comparable to premium digital campaigns",
      "Near-celebrity endorsement value",
    ],
  },
  top_tier: {
    id: "top_tier",
    label: "Top-tier creator",
    followerBand: "1.3M–2M+ followers",
    baseInr: 250_000,
    description: "National reach; brand association carries reputational weight.",
    comparables: [
      "Comparable to celebrity endorsement rates",
      "Comparable to national TV / OTT campaigns",
    ],
  },
};

export const PRICING_TIER_ORDER: PricingTierId[] = [
  "emerging",
  "rising",
  "established",
  "mid_tier",
  "growing",
  "major",
  "notable",
  "top_tier",
];

/**
 * Default tier when we have no other signal (no creator-stated minimum, no
 * follower count). Established gives a safe middle for an unknown creator.
 */
export const DEFAULT_TIER_ID: PricingTierId = "established";

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
 * Wider for emerging tiers (less comp data); tighter for top tiers.
 */
export const RANGE_WIDTH_BY_TIER: Record<PricingTierId, number> = {
  emerging: 0.35,
  rising: 0.32,
  established: 0.3,
  mid_tier: 0.27,
  growing: 0.25,
  major: 0.22,
  notable: 0.2,
  top_tier: 0.18,
};

/** Round recommended amounts to the nearest multiple of this (₹). */
export const ROUNDING_UNIT_INR = 1_000;

/** Classify a creator's self-stated minimum fee into a tier. */
export function tierFromMinFeeInr(minFeeInr: number | null | undefined): PricingTierId {
  if (!minFeeInr || minFeeInr <= 0) return DEFAULT_TIER_ID;
  if (minFeeInr < 10_000) return "emerging";
  if (minFeeInr < 15_000) return "rising";
  if (minFeeInr < 28_000) return "established";
  if (minFeeInr < 50_000) return "mid_tier";
  if (minFeeInr < 80_000) return "growing";
  if (minFeeInr < 130_000) return "major";
  if (minFeeInr < 200_000) return "notable";
  return "top_tier";
}

/**
 * Classify a creator by follower count. Provided for forward-compatibility:
 * the engine accepts this signal but doesn't require it yet (we don't capture
 * follower counts on the profile).
 */
export function tierFromFollowerCount(followers: number | null | undefined): PricingTierId | null {
  if (!followers || followers <= 0) return null;
  if (followers >= 1_300_000) return "top_tier";
  if (followers >= 800_000) return "notable";
  if (followers >= 500_000) return "major";
  if (followers >= 250_000) return "growing";
  if (followers >= 100_000) return "mid_tier";
  if (followers >= 50_000) return "established";
  if (followers >= 30_000) return "rising";
  return "emerging";
}
