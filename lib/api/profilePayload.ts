/**
 * Unwrap standardized `/api/profile` and `/api/profile/completion` JSON bodies.
 */

import { apiErrorMessage, dataFromApiJson } from "@/lib/api/response";

export type ProfileApiPayload = {
  handle?: string | null;
  displayName?: string | null;
  acceptingRequests?: boolean;
  licensingNotes?: string;
  minLicenseFeeInr?: number | null;
  followerCount?: number | null;
  fullName?: string | null;
  phone?: string | null;
  address?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressPinCode?: string | null;
  platformLicenseSigned?: boolean;
  profileBasicsComplete?: boolean;
  profileLinks?: Array<{
    platform: string;
    value: string;
  }>;
  muid?: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export function profileFromApiJson(json: unknown): ProfileApiPayload | null {
  return dataFromApiJson<ProfileApiPayload>(json);
}

export function profileApiErrorMessage(json: unknown, fallback = "Request failed"): string {
  return apiErrorMessage(json, fallback);
}

export function completionFromApiJson(json: unknown): {
  percent: number;
  items: unknown[];
} | null {
  const payload = dataFromApiJson<{ percent?: number; items?: unknown[] }>(json);
  if (!payload) return null;
  const percent = typeof payload.percent === "number" ? payload.percent : 0;
  const items = Array.isArray(payload.items) ? payload.items : [];
  return { percent, items };
}
