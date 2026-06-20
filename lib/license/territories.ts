/** Territories brands pick on license requests — also used for creator region rules. */
export const LICENSE_TERRITORIES = [
  "India",
  "United States",
  "United Kingdom",
  "UAE",
  "Global",
] as const;

export type LicenseTerritory = (typeof LICENSE_TERRITORIES)[number];

const TERRITORY_ALIASES: Record<string, LicenseTerritory> = {
  in: "India",
  india: "India",
  us: "United States",
  usa: "United States",
  "united states": "United States",
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  ae: "UAE",
  uae: "UAE",
  global: "Global",
};

/** Map legacy codes / variants to canonical territory labels. */
export function normalizeLicenseTerritory(value: string): LicenseTerritory | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if ((LICENSE_TERRITORIES as readonly string[]).includes(trimmed)) {
    return trimmed as LicenseTerritory;
  }

  const alias = TERRITORY_ALIASES[trimmed.toLowerCase()];
  return alias ?? null;
}

export function normalizeLicenseTerritories(values: string[] | null | undefined): LicenseTerritory[] {
  if (!values?.length) return [];
  const seen = new Set<LicenseTerritory>();
  for (const value of values) {
    const normalized = normalizeLicenseTerritory(value);
    if (normalized) seen.add(normalized);
  }
  return LICENSE_TERRITORIES.filter((t) => seen.has(t));
}
