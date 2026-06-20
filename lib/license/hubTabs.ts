export type LicenseHubTab = "inbox" | "active" | "history" | "rules-and-rates";

export const LICENSE_HUB_TABS: LicenseHubTab[] = [
  "inbox",
  "active",
  "history",
  "rules-and-rates",
];

export const LICENSE_HUB_TAB_LABELS: Record<LicenseHubTab, string> = {
  inbox: "Inbox",
  active: "Active",
  history: "History",
  "rules-and-rates": "Rules and rates",
};

export function parseLicenseHubTab(value: string | null): LicenseHubTab {
  if (value === "contracts") return "active";
  if (value && LICENSE_HUB_TABS.includes(value as LicenseHubTab)) {
    return value as LicenseHubTab;
  }
  return "inbox";
}

export function licenseHubTabHref(tab: LicenseHubTab): string {
  return tab === "inbox" ? "/licenses" : `/licenses?tab=${tab}`;
}
