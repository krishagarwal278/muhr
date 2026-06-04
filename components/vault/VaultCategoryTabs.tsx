"use client";

import { cx } from "@/lib/cx";

export type VaultCategoryTab = "sheet" | "face" | "voice" | "documents";

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
  const tabs: { id: VaultCategoryTab; label: string; badge?: string }[] = [
    { id: "sheet", label: "Character sheet", badge: counts.sheetLabel },
    { id: "face", label: "Face photos", badge: String(counts.face) },
    { id: "voice", label: "Voice samples", badge: String(counts.voice) },
    { id: "documents", label: "Documents", badge: String(counts.documents) },
  ];

  return (
    <div
      className="flex gap-1 overflow-x-auto rounded-xl border border-black/10 bg-white/80 p-1"
      role="tablist"
      aria-label="Vault categories"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cx(
            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
            active === tab.id
              ? "bg-neutral-950 text-white shadow-sm"
              : "text-neutral-700 hover:bg-black/5 hover:text-neutral-950"
          )}
        >
          {tab.label}
          {tab.badge != null ? (
            <span
              className={cx(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                active === tab.id ? "bg-white/15 text-white" : "bg-black/5 text-neutral-800"
              )}
            >
              {tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
