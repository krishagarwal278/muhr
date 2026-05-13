/**
 * Stable placeholder until `brand_profiles.short_id` exists in the org model.
 * Format matches the product convention (e.g. BR-9F32A1C8).
 */
export function brandShortIdFromUserId(userId: string): string {
  const compact = userId.replace(/-/g, "");
  const slice = compact.slice(0, 8).toUpperCase();
  return `BR-${slice}`;
}
