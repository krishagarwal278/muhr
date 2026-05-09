"use client";

import type { BadgeState, SecurityBadge, SecurityBadgeKey } from "@/types/vault";
import { SimpleTooltip } from "@/components/ui/tooltip";

const stateClass: Record<BadgeState, string> = {
  verified: "border-emerald-600/25 bg-emerald-50 text-emerald-800",
  pending: "border-amber-500/35 bg-amber-50 text-amber-900",
  missing: "border-neutral-200 bg-neutral-100 text-neutral-600",
  unknown: "border-neutral-200 bg-neutral-100 text-neutral-600",
};

function BadgeIcon({ badgeKey }: { badgeKey: SecurityBadgeKey }) {
  const cls = "h-3 w-3 shrink-0";
  switch (badgeKey) {
    case "encrypted":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H5.25a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
      );
    case "liveness":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
          />
        </svg>
      );
    case "hash":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      );
    case "last_accessed":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      );
  }
}

export function SecurityBadges({ badges }: { badges: SecurityBadge[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="list" aria-label="Asset security status">
      {badges.map((badge) => (
        <SimpleTooltip key={badge.key} content={badge.tooltip}>
          <span
            role="listitem"
            className={`inline-flex max-w-full cursor-default items-center gap-1 rounded-full border px-2 py-1 text-xs ${stateClass[badge.state]}`}
          >
            <BadgeIcon badgeKey={badge.key} />
            <span className="min-w-0 truncate">{badge.label}</span>
          </span>
        </SimpleTooltip>
      ))}
    </div>
  );
}
