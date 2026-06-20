import { LICENSE_TERRITORIES, normalizeLicenseTerritories } from "@/lib/license/territories";

/** Channels brands can pick on a license request form. */
export const LICENSE_REQUEST_CHANNELS = [
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

export type LicenseRequestChannel = (typeof LICENSE_REQUEST_CHANNELS)[number];

export const LICENSE_REQUEST_DURATIONS = [30, 90, 180, 365] as const;

const PAID_SOCIAL_CHANNELS: LicenseRequestChannel[] = [
  "Instagram",
  "YouTube",
  "TikTok",
  "Facebook",
  "X / Twitter",
  "LinkedIn",
  "Digital Ads",
];

const BROADCAST_CHANNELS: LicenseRequestChannel[] = ["TV / OTT"];
const OTHER_CHANNELS: LicenseRequestChannel[] = ["Print"];

export type CreatorRequestConstraints = {
  allowPaidSocial: boolean;
  allowBroadcast: boolean;
  allowOther: boolean;
  /** Empty = all standard territories allowed (legacy). */
  permittedRegions: string[];
  defaultDurationDays: number;
};

export const DEFAULT_CREATOR_REQUEST_CONSTRAINTS: CreatorRequestConstraints = {
  allowPaidSocial: true,
  allowBroadcast: true,
  allowOther: true,
  permittedRegions: [],
  defaultDurationDays: 30,
};

export function creatorRequestConstraintsFromRules(row: {
  allow_paid_social?: boolean | null;
  allow_broadcast?: boolean | null;
  allow_other?: boolean | null;
  territories?: string[] | null;
  default_duration_days?: number | null;
} | null): CreatorRequestConstraints {
  if (!row) return { ...DEFAULT_CREATOR_REQUEST_CONSTRAINTS };

  const defaultDurationDays =
    typeof row.default_duration_days === "number" &&
    row.default_duration_days >= 1 &&
    row.default_duration_days <= 365
      ? row.default_duration_days
      : DEFAULT_CREATOR_REQUEST_CONSTRAINTS.defaultDurationDays;

  return {
    allowPaidSocial: row.allow_paid_social !== false,
    allowBroadcast: row.allow_broadcast !== false,
    allowOther: row.allow_other !== false,
    permittedRegions: normalizeLicenseTerritories(row.territories ?? []),
    defaultDurationDays,
  };
}

export function permittedRequestChannels(
  constraints: CreatorRequestConstraints
): LicenseRequestChannel[] {
  const channels: LicenseRequestChannel[] = [];
  if (constraints.allowPaidSocial) channels.push(...PAID_SOCIAL_CHANNELS);
  if (constraints.allowBroadcast) channels.push(...BROADCAST_CHANNELS);
  if (constraints.allowOther) channels.push(...OTHER_CHANNELS);
  return LICENSE_REQUEST_CHANNELS.filter((c) => channels.includes(c));
}

export function permittedRequestTerritories(constraints: CreatorRequestConstraints): string[] {
  if (constraints.permittedRegions.length > 0) {
    return constraints.permittedRegions;
  }
  return [...LICENSE_TERRITORIES];
}

export function permittedRequestDurations(
  constraints: CreatorRequestConstraints
): readonly number[] {
  void constraints;
  return LICENSE_REQUEST_DURATIONS;
}

export function sanitizeRequestSelections(
  constraints: CreatorRequestConstraints,
  selections: {
    channels: string[];
    territories: string[];
    durationDays: number;
  }
): { channels: string[]; territories: string[]; durationDays: number } {
  const allowedChannels = new Set(permittedRequestChannels(constraints));
  const allowedTerritories = new Set(permittedRequestTerritories(constraints));
  const allowedDurations = new Set(permittedRequestDurations(constraints));

  const channels = selections.channels.filter((c) => allowedChannels.has(c as LicenseRequestChannel));
  const territories = selections.territories.filter((t) => allowedTerritories.has(t));
  const durationDays = allowedDurations.has(selections.durationDays)
    ? selections.durationDays
    : constraints.defaultDurationDays;

  return { channels, territories, durationDays };
}

export function validateRequestAgainstConstraints(
  constraints: CreatorRequestConstraints,
  request: { channels: string[]; territories: string[]; durationDays: number }
): { ok: true } | { ok: false; message: string } {
  const allowedChannels = permittedRequestChannels(constraints);
  const allowedTerritories = permittedRequestTerritories(constraints);

  if (allowedChannels.length === 0) {
    return {
      ok: false,
      message: "This creator is not accepting requests for any channels right now.",
    };
  }

  if (allowedTerritories.length === 0) {
    return {
      ok: false,
      message: "This creator has not opened any regions for requests.",
    };
  }

  if (request.channels.length < 1) {
    return { ok: false, message: "Pick at least one channel." };
  }

  for (const channel of request.channels) {
    if (!allowedChannels.includes(channel as LicenseRequestChannel)) {
      return { ok: false, message: "One or more channels are not permitted by this creator." };
    }
  }

  if (request.territories.length < 1) {
    return { ok: false, message: "Pick at least one permitted region." };
  }

  for (const territory of request.territories) {
    if (!allowedTerritories.includes(territory)) {
      return { ok: false, message: "One or more regions are not permitted by this creator." };
    }
  }

  if (!permittedRequestDurations(constraints).includes(request.durationDays)) {
    return { ok: false, message: "Invalid duration for this creator." };
  }

  return { ok: true };
}
