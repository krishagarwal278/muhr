"use client";

import { cx } from "@/lib/cx";

export type PillTabItem<T extends string> = {
  id: T;
  label: string;
  badge?: string | number;
  hideBadgeWhenZero?: boolean;
};

const sizeClasses = {
  sm: {
    bar: "gap-1 p-1",
    tab: "gap-2 px-3 py-2 text-sm",
    badge: "text-[10px]",
  },
  md: {
    bar: "gap-2 p-1.5",
    tab: "gap-2.5 px-4 py-2.5 text-[15px] leading-none",
    badge: "text-xs",
  },
} as const;

export function PillTabBar<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
  size = "sm",
}: {
  tabs: PillTabItem<T>[];
  active: T;
  onChange: (tab: T) => void;
  ariaLabel: string;
  size?: keyof typeof sizeClasses;
}) {
  const sizes = sizeClasses[size];

  return (
    <div
      className={cx(
        "flex overflow-x-auto rounded-xl border border-black/10 bg-white/80",
        sizes.bar
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const showBadge =
          tab.badge != null &&
          !(tab.hideBadgeWhenZero && typeof tab.badge === "number" && tab.badge <= 0);

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cx(
              "flex shrink-0 items-center rounded-lg font-medium transition",
              sizes.tab,
              isActive
                ? "bg-neutral-950 text-white shadow-sm"
                : "text-neutral-700 hover:bg-black/5 hover:text-neutral-950"
            )}
          >
            {tab.label}
            {showBadge ? (
              <span
                className={cx(
                  "rounded-full px-2 py-0.5 font-semibold tabular-nums",
                  sizes.badge,
                  isActive ? "bg-white/15 text-white" : "bg-black/5 text-neutral-800"
                )}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
