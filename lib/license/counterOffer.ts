
export const COUNTER_OFFER_MAX_DURATION_DAYS = 3650;
export const COUNTER_OFFER_MAX_BUDGET_INR = 100_000_000;
export const COUNTER_OFFER_MAX_NOTE_LENGTH = 1000;
export const COUNTER_OFFER_MAX_CHANNELS = 12;
export const COUNTER_OFFER_MAX_TERRITORIES = 12;

/** Align with `LicenseRequestPanel` so pricing multipliers match brand requests. */
export const LICENSE_CHANNEL_OPTIONS = [
  "Instagram",
  "YouTube",
  "TikTok",
  "Facebook",
  "X / Twitter",
  "LinkedIn",
  "Digital Ads",
  "TV / OTT",
  "Print",
] as const;

export const LICENSE_TERRITORY_OPTIONS = [
  "India",
  "United States",
  "United Kingdom",
  "UAE",
  "Global",
] as const;

export type ParsedCounterOfferPayload = {
  channels: string[];
  territories: string[];
  durationDays: number;
  proposedBudgetInr: number;
  note: string;
};

export function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number.parseInt(value.trim(), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parseCounterOfferPayload(
  body: Record<string, unknown>
): { ok: true; payload: ParsedCounterOfferPayload } | { ok: false; error: string } {
  const rawChannels = Array.isArray(body.channels) ? body.channels : [];
  const channels = rawChannels
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .slice(0, COUNTER_OFFER_MAX_CHANNELS);

  const rawTerritories = Array.isArray(body.territories) ? body.territories : [];
  const territories = rawTerritories
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, COUNTER_OFFER_MAX_TERRITORIES);

  const durationDays = parsePositiveInt(body.durationDays);
  const proposedBudgetInr = parsePositiveInt(body.proposedBudgetInr);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, COUNTER_OFFER_MAX_NOTE_LENGTH) : "";

  if (channels.length === 0) {
    return { ok: false, error: "At least one channel is required." };
  }
  if (territories.length === 0) {
    return { ok: false, error: "At least one territory is required." };
  }
  if (durationDays == null || durationDays <= 0 || durationDays > COUNTER_OFFER_MAX_DURATION_DAYS) {
    return {
      ok: false,
      error: `Duration must be between 1 and ${COUNTER_OFFER_MAX_DURATION_DAYS.toLocaleString("en-IN")} days.`,
    };
  }
  if (
    proposedBudgetInr == null ||
    proposedBudgetInr <= 0 ||
    proposedBudgetInr > COUNTER_OFFER_MAX_BUDGET_INR
  ) {
    return { ok: false, error: "Proposed budget must be a positive amount in INR." };
  }

  return {
    ok: true,
    payload: { channels, territories, durationDays, proposedBudgetInr, note },
  };
}

export type JoinedLicenseRequest = {
  id: string;
  brand_email: string;
  status: string;
  creator_id: string;
  brand_user_id?: string | null;
};

/** Supabase may return a joined row as an object or single-element array. */
export function parseJoinedLicenseRequest(raw: unknown): JoinedLicenseRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  return {
    id: r.id,
    brand_email: typeof r.brand_email === "string" ? r.brand_email : "",
    status: typeof r.status === "string" ? r.status : "pending",
    creator_id: typeof r.creator_id === "string" ? r.creator_id : "",
    brand_user_id: typeof r.brand_user_id === "string" ? r.brand_user_id : null,
  };
}
