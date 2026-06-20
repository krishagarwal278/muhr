import type { LicenseRequestRow } from "@/types/license";

/** dd/mm/yyyy for license inbox and active deal dates. */
export function formatLicenseHubDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateReceived(request: LicenseRequestRow): string {
  return `Received ${formatLicenseHubDate(request.created_at)}`;
}

export function formatBriefExpiry(request: LicenseRequestRow): string | null {
  if (!request.expires_at) return null;
  const expires = new Date(request.expires_at);
  if (expires.getTime() < Date.now()) return `Expired ${formatLicenseHubDate(request.expires_at)}`;
  return `Expires ${formatLicenseHubDate(request.expires_at)}`;
}

function addDays(from: Date, days: number): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + days);
  return end;
}

/** License end date for accepted / active deals. */
export function resolveActiveLicenseExpiry(request: LicenseRequestRow): Date | null {
  if (request.contract_effective_at && request.duration_days) {
    return addDays(new Date(request.contract_effective_at), request.duration_days);
  }
  if (request.status === "accepted" && request.responded_at && request.duration_days) {
    return addDays(new Date(request.responded_at), request.duration_days);
  }
  if (request.expires_at) {
    return new Date(request.expires_at);
  }
  return null;
}

export function formatActiveLicenseExpiry(request: LicenseRequestRow): string | null {
  const expiry = resolveActiveLicenseExpiry(request);
  if (!expiry) return null;
  if (expiry.getTime() < Date.now()) {
    return `Expired ${formatLicenseHubDate(expiry.toISOString())}`;
  }
  return `Expires ${formatLicenseHubDate(expiry.toISOString())}`;
}
