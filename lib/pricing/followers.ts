import { tierFromFollowerCount, type PricingTierId } from "./tiers";

/** Slider floor (1K) and ceiling (2M) for dashboard estimates. */
export const FOLLOWER_SLIDER_MIN = 1_000;
export const FOLLOWER_SLIDER_MAX = 2_000_000;

/** Default when the creator has not set a count yet (~mid established band). */
export const FOLLOWER_SLIDER_DEFAULT = 25_000;

/** Tier band lower bounds for the spectrum UI (inclusive). */
export const FOLLOWER_TIER_BANDS: Array<{
  tierId: PricingTierId;
  minFollowers: number;
  label: string;
}> = [
  { tierId: "emerging", minFollowers: 0, label: "<10K" },
  { tierId: "established", minFollowers: 10_000, label: "10K–100K" },
  { tierId: "mid_tier", minFollowers: 100_000, label: "100K–500K" },
  { tierId: "major", minFollowers: 500_000, label: "500K–1M" },
  { tierId: "top_tier", minFollowers: 1_000_000, label: "1M+" },
];

export function formatFollowerCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m >= 10 ? `${Math.round(m)}M` : `${m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 10_000) {
    const k = n / 1_000;
    return k >= 100 ? `${Math.round(k)}K` : `${k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return n.toLocaleString("en-IN");
}

/** Map slider position 0–1 to follower count (log scale). */
export function followersFromSliderPosition(position: number): number {
  const t = Math.min(1, Math.max(0, position));
  const minLog = Math.log(FOLLOWER_SLIDER_MIN);
  const maxLog = Math.log(FOLLOWER_SLIDER_MAX);
  return Math.round(Math.exp(minLog + t * (maxLog - minLog)));
}

/** Map follower count to slider position 0–1 (log scale). */
export function sliderPositionFromFollowers(followers: number): number {
  const clamped = Math.min(FOLLOWER_SLIDER_MAX, Math.max(FOLLOWER_SLIDER_MIN, followers));
  const minLog = Math.log(FOLLOWER_SLIDER_MIN);
  const maxLog = Math.log(FOLLOWER_SLIDER_MAX);
  return (Math.log(clamped) - minLog) / (maxLog - minLog);
}

export function activeTierIdFromFollowers(followers: number): PricingTierId {
  return tierFromFollowerCount(followers) ?? "emerging";
}
