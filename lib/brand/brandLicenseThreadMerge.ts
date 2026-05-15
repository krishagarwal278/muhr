/** Higher = more "open" for picking the primary row in a duplicate group. */
export function licenseRequestStatusRank(status: string): number {
  if (status === "accepted") return 3;
  if (status === "pending") return 2;
  return 1;
}

export function aggregateLicenseRequestStatuses(statuses: string[]): string {
  if (statuses.includes("accepted")) return "accepted";
  if (statuses.includes("pending")) return "pending";
  for (const s of ["withdrawn", "declined", "expired"]) {
    if (statuses.includes(s)) return s;
  }
  return statuses[0] ?? "pending";
}

/** One row per creator relationship: prefer accepted, then newest. */
export function pickCanonicalLicenseRequest<T extends { id: string; status: string; created_at: string }>(
  group: T[]
): T {
  if (group.length === 0) {
    throw new Error("pickCanonicalLicenseRequest: empty group");
  }
  return [...group].sort((a, b) => {
    const d = licenseRequestStatusRank(b.status) - licenseRequestStatusRank(a.status);
    if (d !== 0) return d;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })[0];
}
