"use client";

import Link from "next/link";
import type { LicenseRequestRow } from "@/types/license";
import { formatBriefExpiry, formatDateReceived } from "@/lib/license/dates";

const BRAND_AVATAR_COLORS = [
  "bg-slate-800",
  "bg-violet-700",
  "bg-teal-700",
  "bg-indigo-700",
  "bg-sky-700",
];

function brandInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatBudget(inr: number | null): string {
  if (inr == null || inr <= 0) return "Budget TBD";
  return `₹${inr.toLocaleString("en-IN")}`;
}

export function IncomingBriefsPanel({
  requests,
  loading,
}: {
  requests: LicenseRequestRow[];
  loading: boolean;
}) {
  const preview = requests.slice(0, 4);

  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="muhr-display text-lg text-neutral-950">Incoming briefs</h2>
          <p className="mt-1 text-sm text-neutral-500">New license requests from brands</p>
        </div>
        <Link
          href="/licenses"
          className="shrink-0 text-sm font-medium text-[#2D5BFF] transition hover:text-[#2548d9]"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : preview.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-8 text-center">
          <p className="text-sm text-neutral-600">No pending briefs right now.</p>
          <p className="mt-1 text-xs text-neutral-500">Share your Muhr pass link to receive requests.</p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-neutral-100" role="list">
          {preview.map((request, index) => (
            <li key={request.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white ${BRAND_AVATAR_COLORS[index % BRAND_AVATAR_COLORS.length]}`}
              >
                {brandInitials(request.brand_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-950">{request.brand_name}</p>
                <p className="truncate text-xs text-neutral-500">
                  {request.brand_company ? `${request.brand_company} · ` : ""}
                  {formatDateReceived(request)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                <span className="text-sm font-semibold tabular-nums text-neutral-950">
                  {formatBudget(request.budget_inr)}
                </span>
                {formatBriefExpiry(request) ? (
                  <span className="text-xs text-neutral-600">{formatBriefExpiry(request)}</span>
                ) : null}
                <Link
                  href={`/licenses/requests/${request.id}`}
                  className="inline-flex items-center justify-center rounded-full bg-[#2D5BFF] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2548d9]"
                >
                  Review
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
