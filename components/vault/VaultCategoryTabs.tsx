"use client";

import { PillTabBar } from "@/components/ui/pill-tab-bar";

export type VaultCategoryTab = "sheet" | "face" | "voice" | "documents";

const VAULT_TABS: VaultCategoryTab[] = ["sheet", "face", "voice", "documents"];

const VAULT_TAB_LABELS: Record<VaultCategoryTab, string> = {
  sheet: "Character sheet",
  face: "Face photos",
  voice: "Voice samples",
  documents: "Documents",
};

export function VaultCategoryTabs({
  active,
  onChange,
  counts,
}: {
  active: VaultCategoryTab;
  onChange: (tab: VaultCategoryTab) => void;
  counts: {
    face: number;
    voice: number;
    documents: number;
    sheetLabel: string;
  };
}) {
  const badgeByTab: Record<VaultCategoryTab, string | number> = {
    sheet: counts.sheetLabel,
    face: counts.face,
    voice: counts.voice,
    documents: counts.documents,
  };

  const tabs = VAULT_TABS.map((id) => ({
    id,
    label: VAULT_TAB_LABELS[id],
    badge: badgeByTab[id],
  }));

  return (
    <PillTabBar
      tabs={tabs}
      active={active}
      onChange={onChange}
      ariaLabel="Vault categories"
      size="sm"
    />
  );
}
