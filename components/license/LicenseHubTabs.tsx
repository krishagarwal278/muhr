"use client";

import { cx } from "@/lib/cx";
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
  return (
    <div className="border-b border-neutral-200" role="tablist" aria-label="License sections">
      <div className="-mb-px flex gap-6 overflow-x-auto">
        {LICENSE_HUB_TABS.map((id) => {
          const isActive = active === id;
          const count =
            id === "inbox"
              ? counts.inbox
              : id === "active"
                ? counts.active
                : id === "history"
                  ? counts.history
                  : null;
          const showCount = typeof count === "number" && count > 0;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(id)}
              className={cx(
                "flex shrink-0 items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-semibold transition",
                isActive
                  ? "border-[#2D5BFF] text-[#2D5BFF]"
                  : "border-transparent text-neutral-600 hover:text-neutral-950",
              )}
            >
              {LICENSE_HUB_TAB_LABELS[id]}
              {showCount ? (
                <span
                  className={cx(
                    "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    isActive ? "bg-[#2D5BFF]/10 text-[#2D5BFF]" : "bg-neutral-100 text-neutral-700",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
