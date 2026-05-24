"use client";

import Link from "next/link";
import type { ProfileCompletionItem } from "@/lib/profile/completion";

interface ProfileCompletionCardProps {
  percent: number;
  items: ProfileCompletionItem[];
  compact?: boolean;
}

export function ProfileCompletionCard({ percent, items, compact }: ProfileCompletionCardProps) {
  const incomplete = items.filter((i) => !i.complete);

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-neutral-950">Complete your profile</h2>
          {!compact && (
            <p className="mt-1 text-sm text-neutral-700">
              Finish setup so brands can discover and license your likeness.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-black/10 sm:max-w-[200px]">
            <div
              className="h-full rounded-full bg-neutral-950 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-sm font-semibold tabular-nums text-neutral-950">{percent}%</span>
        </div>
      </div>

      {!compact && incomplete.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5 text-sm">
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  item.complete
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-neutral-300 bg-white"
                }`}
                aria-hidden
              >
                {item.complete ? (
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-7.5" />
                  </svg>
                ) : null}
              </span>
              {item.href && !item.complete ? (
                <Link href={item.href} className="text-neutral-800 underline-offset-2 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={item.complete ? "text-neutral-600 line-through" : "text-neutral-900"}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {compact && incomplete.length > 0 && (
        <p className="mt-2 text-sm text-neutral-700">
          {incomplete.length} task{incomplete.length !== 1 ? "s" : ""} remaining —{" "}
          <Link
            href="/profile#complete-profile"
            className="font-medium text-neutral-950 underline-offset-2 hover:underline"
          >
            Continue setup
          </Link>
        </p>
      )}
    </div>
  );
}
