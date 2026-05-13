import type { LicenseRequestRow } from "@/types/license";

/** In-app license thread: allowed before accept and while active. */
export function canExchangeLicenseMessages(status: string): boolean {
  return status === "pending" || status === "accepted";
}

/** In-app messaging when the request is still negotiable (creator or matching brand email). */
export function canUseInAppLicenseMessaging(row: { status: string }): boolean {
  return canExchangeLicenseMessages(row.status);
}
