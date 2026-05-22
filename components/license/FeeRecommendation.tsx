"use client";

import { useMemo, useState } from "react";
import type { CreatorAnchor, LicenseParams } from "@/lib/pricing/recommend";
import { recommendFee } from "@/lib/pricing/recommend";

interface FeeRecommendationProps {
  anchor: CreatorAnchor;
  params: LicenseParams;
  /** Optional callback when the user clicks "Use the midpoint as my budget". */
  onUseMid?: (inr: number) => void;
  /** Optional callback when the user clicks "Use the low end". */
  onUseLow?: (inr: number) => void;
  /** Optional callback when the user clicks "Use the high end". */
  onUseHigh?: (inr: number) => void;
  /** Compact rendering for tight surfaces (e.g. sidebars). */
  compact?: boolean;
}

function formatInr(n: number): string {
  if (n <= 0) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

/**
 * Brand-facing fee recommendation card. Pure UI on top of `recommendFee`.
 * Re-computes whenever `anchor` or `params` change, with no network calls.
 */
export function FeeRecommendation({
  anchor,
  params,
  onUseMid,
  onUseLow,
  onUseHigh,
  compact = false,
}: FeeRecommendationProps) {
  const rec = useMemo(() => recommendFee(anchor, params), [anchor, params]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const noScopePicked =
    params.channels.length === 0 ||
    params.territories.length === 0 ||
    !params.durationDays;

  if (noScopePicked) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 p-4 text-sm text-neutral-700">
        <p className="font-medium text-neutral-900">Fair-fee estimate</p>
        <p className="mt-1 text-neutral-700">
          Pick a duration, at least one channel, and at least one territory above to see a suggested
          range for {rec.tier.label.toLowerCase()}s.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.06)]"
      data-testid="fee-recommendation"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Suggested fee range
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500">
            Estimate · {rec.tier.label}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
          />
          Estimate
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3 rounded-lg bg-gradient-to-br from-neutral-50 to-neutral-100/70 p-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Mid-point
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-neutral-950">
            {formatInr(rec.midInr)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Range</p>
          <p className="mt-0.5 text-sm tabular-nums text-neutral-800">
            {formatInr(rec.lowInr)} – {formatInr(rec.highInr)}
          </p>
        </div>
      </div>

      {onUseMid || onUseLow || onUseHigh ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {onUseLow ? (
            <button
              type="button"
              onClick={() => onUseLow(rec.lowInr)}
              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              Use low ({formatInr(rec.lowInr)})
            </button>
          ) : null}
          {onUseMid ? (
            <button
              type="button"
              onClick={() => onUseMid(rec.midInr)}
              className="rounded-md bg-neutral-950 px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90"
            >
              Use mid ({formatInr(rec.midInr)})
            </button>
          ) : null}
          {onUseHigh ? (
            <button
              type="button"
              onClick={() => onUseHigh(rec.highInr)}
              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              Use high ({formatInr(rec.highInr)})
            </button>
          ) : null}
        </div>
      ) : null}

      {!compact && rec.rationale.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Why this range
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-neutral-700">
            {rec.rationale.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowBreakdown((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-neutral-700 underline-offset-2 hover:text-neutral-950 hover:underline"
        aria-expanded={showBreakdown}
      >
        {showBreakdown ? "Hide" : "Show"} per-driver breakdown
      </button>

      {showBreakdown ? (
        <dl className="mt-3 space-y-2 rounded-lg border border-neutral-200/80 bg-neutral-50/60 p-3 text-xs">
          {rec.breakdown.map((row) => (
            <div key={row.key} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <dt className="font-medium text-neutral-900">{row.label}</dt>
                <dd className="mt-0.5 text-neutral-600">{row.detail}</dd>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-semibold tabular-nums text-neutral-800 ring-1 ring-neutral-200">
                {row.key === "base" ? formatInr(row.value) : row.display}
              </span>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-4 rounded-md border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
        <p className="font-medium">A note on this estimate</p>
        <ul className="mt-1 space-y-0.5">
          {rec.caveats.map((c, i) => (
            <li key={i}>· {c}</li>
          ))}
          <li>
            · The creator may quote anywhere inside or outside this range — it’s a starting point
            for the conversation, not a final price.
          </li>
        </ul>
      </div>
    </div>
  );
}
