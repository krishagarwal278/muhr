import type { ConsentRulesPayload } from "@/lib/api/consentPayload";
import { normalizeOtherUsageNotes } from "@/lib/format/text";
import { normalizeLicenseTerritories } from "@/lib/license/territories";

export type RulesAndRatesPayload = ConsentRulesPayload & {
  faceOnlyRateInr: number | null;
  voiceFaceRateInr: number | null;
  voiceOnlyRateInr: number | null;
  otherRateInr: number | null;
  exclusivityUpliftPercent: number;
  ratePeriodDays: number;
  allowPaidSocial: boolean;
  allowBroadcast: boolean;
  allowPoliticalContent: boolean;
  allowAlcoholGambling: boolean;
  allowOther: boolean;
  otherUsageNotes: string | null;
  requireExclusivityOptIn: boolean;
};

export const DEFAULT_RULES_AND_RATES: RulesAndRatesPayload = {
  channels: [],
  territories: [],
  blockedCategories: ["politics"],
  allowVoiceSynthesis: false,
  allowFaceReenactment: false,
  requireApprovalPerUse: true,
  defaultDurationDays: 90,
  faceOnlyRateInr: null,
  voiceFaceRateInr: null,
  voiceOnlyRateInr: null,
  otherRateInr: null,
  exclusivityUpliftPercent: 40,
  ratePeriodDays: 30,
  allowPaidSocial: true,
  allowBroadcast: true,
  allowPoliticalContent: false,
  allowAlcoholGambling: false,
  allowOther: true,
  otherUsageNotes: null,
  requireExclusivityOptIn: true,
};

type ConsentRulesRow = {
  channels?: string[] | null;
  territories?: string[] | null;
  blocked_categories?: string[] | null;
  allow_voice_synthesis?: boolean | null;
  allow_face_reenactment?: boolean | null;
  require_approval_per_use?: boolean | null;
  default_duration_days?: number | null;
  face_only_rate_inr?: number | null;
  voice_face_rate_inr?: number | null;
  voice_only_rate_inr?: number | null;
  other_rate_inr?: number | null;
  exclusivity_uplift_percent?: number | null;
  rate_period_days?: number | null;
  allow_paid_social?: boolean | null;
  allow_broadcast?: boolean | null;
  allow_political_content?: boolean | null;
  allow_alcohol_gambling?: boolean | null;
  allow_other?: boolean | null;
  other_usage_notes?: string | null;
  require_exclusivity_opt_in?: boolean | null;
};

export function blockedCategoriesFromUsageToggles(input: {
  allowPoliticalContent: boolean;
  allowAlcoholGambling: boolean;
}): string[] {
  const blocked: string[] = [];
  if (!input.allowPoliticalContent) blocked.push("politics");
  if (!input.allowAlcoholGambling) {
    blocked.push("alcohol", "gambling");
  }
  return blocked;
}

export function usageTogglesFromBlockedCategories(blockedCategories: string[]): {
  allowPoliticalContent: boolean;
  allowAlcoholGambling: boolean;
} {
  const blocked = new Set(blockedCategories);
  return {
    allowPoliticalContent: !blocked.has("politics"),
    allowAlcoholGambling: !blocked.has("alcohol") && !blocked.has("gambling"),
  };
}

export function rulesAndRatesFromRow(row: ConsentRulesRow | null): RulesAndRatesPayload {
  if (!row) return { ...DEFAULT_RULES_AND_RATES };

  const blockedCategories = row.blocked_categories ?? ["politics"];
  const fromBlocked = usageTogglesFromBlockedCategories(blockedCategories);

  return {
    channels: row.channels ?? [],
    territories: normalizeLicenseTerritories(row.territories ?? []),
    blockedCategories,
    allowVoiceSynthesis: row.allow_voice_synthesis ?? false,
    allowFaceReenactment: row.allow_face_reenactment ?? false,
    requireApprovalPerUse: row.require_approval_per_use ?? true,
    defaultDurationDays: row.default_duration_days ?? 90,
    faceOnlyRateInr: row.face_only_rate_inr ?? null,
    voiceFaceRateInr: row.voice_face_rate_inr ?? null,
    voiceOnlyRateInr: row.voice_only_rate_inr ?? null,
    otherRateInr: row.other_rate_inr ?? null,
    exclusivityUpliftPercent: row.exclusivity_uplift_percent ?? 40,
    ratePeriodDays: row.rate_period_days ?? 30,
    allowPaidSocial: row.allow_paid_social ?? true,
    allowBroadcast: row.allow_broadcast ?? true,
    allowPoliticalContent: row.allow_political_content ?? fromBlocked.allowPoliticalContent,
    allowAlcoholGambling: row.allow_alcohol_gambling ?? fromBlocked.allowAlcoholGambling,
    allowOther: row.allow_other ?? true,
    otherUsageNotes: normalizeOtherUsageNotes(row.other_usage_notes),
    requireExclusivityOptIn: row.require_exclusivity_opt_in ?? true,
  };
}

export function rowPatchFromRulesAndRates(input: RulesAndRatesPayload) {
  const blockedCategories = blockedCategoriesFromUsageToggles({
    allowPoliticalContent: input.allowPoliticalContent,
    allowAlcoholGambling: input.allowAlcoholGambling,
  });

  return {
    channels: input.channels,
    territories: normalizeLicenseTerritories(input.territories),
    blocked_categories: blockedCategories,
    allow_voice_synthesis: input.allowVoiceSynthesis,
    allow_face_reenactment: input.allowFaceReenactment,
    require_approval_per_use: input.requireApprovalPerUse,
    default_duration_days: input.defaultDurationDays,
    face_only_rate_inr: input.faceOnlyRateInr,
    voice_face_rate_inr: input.voiceFaceRateInr,
    voice_only_rate_inr: input.voiceOnlyRateInr,
    other_rate_inr: input.otherRateInr,
    exclusivity_uplift_percent: input.exclusivityUpliftPercent,
    rate_period_days: input.ratePeriodDays,
    allow_paid_social: input.allowPaidSocial,
    allow_broadcast: input.allowBroadcast,
    allow_political_content: input.allowPoliticalContent,
    allow_alcohol_gambling: input.allowAlcoholGambling,
    allow_other: input.allowOther,
    other_usage_notes: normalizeOtherUsageNotes(input.otherUsageNotes),
    require_exclusivity_opt_in: input.requireExclusivityOptIn,
  };
}

export function rulesAndRatesFromApiJson(json: unknown): RulesAndRatesPayload | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const data =
    root.ok === true && root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  return {
    ...DEFAULT_RULES_AND_RATES,
    channels: Array.isArray(data.channels) ? (data.channels as string[]) : [],
    territories: normalizeLicenseTerritories(
      Array.isArray(data.territories) ? (data.territories as string[]) : []
    ),
    blockedCategories: Array.isArray(data.blockedCategories)
      ? (data.blockedCategories as string[])
      : ["politics"],
    allowVoiceSynthesis: data.allowVoiceSynthesis === true,
    allowFaceReenactment: data.allowFaceReenactment === true,
    requireApprovalPerUse: data.requireApprovalPerUse !== false,
    defaultDurationDays:
      typeof data.defaultDurationDays === "number" ? data.defaultDurationDays : 90,
    faceOnlyRateInr:
      typeof data.faceOnlyRateInr === "number" ? data.faceOnlyRateInr : null,
    voiceFaceRateInr:
      typeof data.voiceFaceRateInr === "number" ? data.voiceFaceRateInr : null,
    voiceOnlyRateInr:
      typeof data.voiceOnlyRateInr === "number" ? data.voiceOnlyRateInr : null,
    otherRateInr: typeof data.otherRateInr === "number" ? data.otherRateInr : null,
    exclusivityUpliftPercent:
      typeof data.exclusivityUpliftPercent === "number" ? data.exclusivityUpliftPercent : 40,
    ratePeriodDays: typeof data.ratePeriodDays === "number" ? data.ratePeriodDays : 30,
    allowPaidSocial: data.allowPaidSocial !== false,
    allowBroadcast: data.allowBroadcast !== false,
    allowPoliticalContent: data.allowPoliticalContent === true,
    allowAlcoholGambling: data.allowAlcoholGambling === true,
    allowOther: data.allowOther !== false,
    otherUsageNotes:
      typeof data.otherUsageNotes === "string"
        ? normalizeOtherUsageNotes(data.otherUsageNotes)
        : null,
    requireExclusivityOptIn: data.requireExclusivityOptIn !== false,
  };
}
