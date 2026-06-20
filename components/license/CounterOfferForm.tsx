"use client";

import { useState, useMemo } from "react";
import { FeeRecommendation } from "@/components/license/FeeRecommendation";
import {
  LICENSE_CHANNEL_OPTIONS,
  LICENSE_TERRITORY_OPTIONS,
} from "@/lib/license/counterOffer";
import { ghostButtonVariants, solidButtonVariants } from "@/components/ui/button-recipes";
import { FormNumberInput } from "@/components/ui/form-number-input";

const CHANNELS = [...LICENSE_CHANNEL_OPTIONS];
const TERRITORIES = [...LICENSE_TERRITORY_OPTIONS];

interface CounterOfferFormProps {
  creatorMinLicenseFeeInr: number | null;
  originalChannels: string[];
  originalTerritories: string[];
  originalDurationDays: number;
  originalBudgetInr: number | null;
  originalIntendedUse?: string;
  onSubmit: (offer: {
    channels: string[];
    territories: string[];
    durationDays: number;
    proposedBudgetInr: number;
    note: string;
  }) => Promise<void>;
  onCancel: () => void;
  busy?: boolean;
}

/**
 * Form for creators to propose revised terms (channels, territories, duration, budget).
 * Displays live fee recommendation based on adjusted parameters.
 */
export function CounterOfferForm({
  creatorMinLicenseFeeInr,
  originalChannels,
  originalTerritories,
  originalDurationDays,
  originalBudgetInr,
  originalIntendedUse,
  onSubmit,
  onCancel,
  busy = false,
}: CounterOfferFormProps) {
  const [channels, setChannels] = useState<string[]>(originalChannels);
  const [territories, setTerritories] = useState<string[]>(originalTerritories);
  const [durationDays, setDurationDays] = useState<number>(originalDurationDays);
  const [note, setNote] = useState<string>("");
  const [proposedBudgetInr, setProposedBudgetInr] = useState<number | null>(
    originalBudgetInr ?? null
  );

  const toggleChannel = (ch: string) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  const toggleTerritory = (t: string) => {
    setTerritories((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const recommendation = useMemo(() => {
    if (channels.length === 0 || territories.length === 0 || durationDays <= 0) return null;
    return {
      anchor: { minLicenseFeeInr: creatorMinLicenseFeeInr },
      params: { channels, territories, durationDays },
    };
  }, [channels, territories, durationDays, creatorMinLicenseFeeInr]);

  const canSubmit =
    channels.length > 0 &&
    territories.length > 0 &&
    durationDays > 0 &&
    proposedBudgetInr != null &&
    proposedBudgetInr > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    await onSubmit({
      channels,
      territories,
      durationDays,
      proposedBudgetInr: proposedBudgetInr!,
      note: note.trim(),
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/40 to-indigo-50/20 p-4">
      <div>
        <h3 className="text-sm font-semibold text-purple-950">Propose revised terms</h3>
        <p className="mt-1 text-xs text-purple-900/70">
          Adjust the channels, territories, duration, and budget. The brand can accept or decline your
          counter-offer.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200/80 bg-white/80 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
          Brand&apos;s original offer (for reference)
        </p>
        {originalIntendedUse ? (
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-neutral-800">
            {originalIntendedUse}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {originalChannels.map((c) => (
            <span
              key={c}
              className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-800"
            >
              {c}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-700">
          <span>
            <span className="font-medium text-neutral-600">Duration:</span> {originalDurationDays} days
          </span>
          <span>
            <span className="font-medium text-neutral-600">Budget:</span>{" "}
            {originalBudgetInr != null
              ? `₹${originalBudgetInr.toLocaleString("en-IN")}`
              : "—"}
          </span>
          <span>
            <span className="font-medium text-neutral-600">Territories:</span>{" "}
            {originalTerritories.join(", ") || "—"}
          </span>
        </div>
      </div>

      {/* Channels */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-purple-900">
          Channels
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CHANNELS.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => toggleChannel(ch)}
              disabled={busy}
              className={
                channels.includes(ch)
                  ? "rounded-full border border-purple-300 bg-purple-100 px-3 py-1 text-xs font-medium text-purple-950 transition hover:bg-purple-200 disabled:opacity-50"
                  : "rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700 transition hover:border-purple-300 hover:bg-purple-50 disabled:opacity-50"
              }
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Territories */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-purple-900">
          Territories
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {TERRITORIES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTerritory(t)}
              disabled={busy}
              className={
                territories.includes(t)
                  ? "rounded-full border border-purple-300 bg-purple-100 px-3 py-1 text-xs font-medium text-purple-950 transition hover:bg-purple-200 disabled:opacity-50"
                  : "rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700 transition hover:border-purple-300 hover:bg-purple-50 disabled:opacity-50"
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label
          htmlFor="counter-duration"
          className="block text-xs font-semibold uppercase tracking-wide text-purple-900"
        >
          Duration (days)
        </label>
        <FormNumberInput
          id="counter-duration"
          size="sm"
          value={durationDays}
          onChange={(value) => {
            if (value != null && value >= 1 && value <= 3650) setDurationDays(value);
          }}
          disabled={busy}
          className="mt-2 w-full max-w-xs"
        />
      </div>

      {/* Live fee recommendation */}
      {recommendation ? (
        <FeeRecommendation
          anchor={recommendation.anchor}
          params={recommendation.params}
          onUseMid={(inr) => setProposedBudgetInr(inr)}
          onUseLow={(inr) => setProposedBudgetInr(inr)}
          onUseHigh={(inr) => setProposedBudgetInr(inr)}
          compact
        />
      ) : (
        <p className="text-xs text-purple-900/70">
          Pick at least one channel and one territory to see a fee estimate.
        </p>
      )}

      {/* Proposed budget */}
      <div>
        <label
          htmlFor="counter-budget"
          className="block text-xs font-semibold uppercase tracking-wide text-purple-900"
        >
          Your proposed budget (INR)
        </label>
        <FormNumberInput
          id="counter-budget"
          size="sm"
          value={proposedBudgetInr}
          onChange={setProposedBudgetInr}
          disabled={busy}
          placeholder="e.g. 50,000"
          className="mt-2 w-full max-w-xs"
        />
        <p className="mt-1 text-xs text-purple-900/60">
          Use the recommended range above or set your own rate.
        </p>
      </div>

      {/* Optional note */}
      <div>
        <label
          htmlFor="counter-note"
          className="block text-xs font-semibold uppercase tracking-wide text-purple-900"
        >
          Note to brand (optional)
        </label>
        <textarea
          id="counter-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy}
          rows={3}
          maxLength={1000}
          placeholder="Explain why you're proposing these changes (e.g., 'I can do Instagram + Facebook for 30 days at ₹60k')."
          className="mt-2 w-full resize-y rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:opacity-50"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-purple-200/60 pt-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || !canSubmit}
          className={solidButtonVariants()}
        >
          {busy ? "Submitting…" : "Submit counter-offer"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={ghostButtonVariants()}>
          Cancel
        </button>
      </div>
    </div>
  );
}
