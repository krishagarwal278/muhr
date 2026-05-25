/**
 * Unwrap standardized `/api/profile` and `/api/profile/completion` JSON bodies.
 */

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
  muid?: string;
  email?: string | null;
};

export function profileFromApiJson(json: unknown): ProfileApiPayload | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  if (root.ok === true && root.data && typeof root.data === "object") {
    return root.data as ProfileApiPayload;
  }
  if (!("ok" in root)) {
    return root as ProfileApiPayload;
  }
  return null;
}

export function profileApiErrorMessage(json: unknown, fallback = "Request failed"): string {
  if (!json || typeof json !== "object") return fallback;
  const root = json as Record<string, unknown>;
  const err = root.error;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (typeof root.error === "string" && root.error.trim()) return root.error;
  return fallback;
}

export function completionFromApiJson(json: unknown): {
  percent: number;
  items: unknown[];
} | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const payload =
    root.ok === true && root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  const percent = typeof payload.percent === "number" ? payload.percent : 0;
  const items = Array.isArray(payload.items) ? payload.items : [];
  return { percent, items };
}
