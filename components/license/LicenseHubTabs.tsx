"use client";

import { PillTabBar } from "@/components/ui/pill-tab-bar";
import {
  LICENSE_HUB_TAB_LABELS,
  LICENSE_HUB_TABS,
  type LicenseHubTab,
} from "@/lib/license/hubTabs";

export type { LicenseHubTab };

export function LicenseHubTabs({
  active,
  onChange,
  counts,
}: {
  active: LicenseHubTab;
  onChange: (tab: LicenseHubTab) => void;
  counts: { inbox: number; active: number; history: number };
}) {
  const tabs = LICENSE_HUB_TABS.map((id) => ({
    id,
    label: LICENSE_HUB_TAB_LABELS[id],
    badge:
      id === "inbox"
        ? counts.inbox
        : id === "active"
          ? counts.active
          : id === "history"
            ? counts.history
            : undefined,
    hideBadgeWhenZero: true,
  }));

  return (
    <PillTabBar
      tabs={tabs}
      active={active}
      onChange={onChange}
      ariaLabel="License sections"
      size="md"
    />
  );
}
