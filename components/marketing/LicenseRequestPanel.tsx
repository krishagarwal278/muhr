"use client";

import Link from "next/link";
import { useState } from "react";

const CHANNELS = [
  "Instagram",
  "YouTube",
  "TikTok",
  "Facebook",
  "X / Twitter",
  "LinkedIn",
  "Digital Ads",
  "TV / OTT",
  "Print",
] as const;

const TERRITORIES = ["India", "United States", "United Kingdom", "UAE", "Global"] as const;

const DURATIONS = [30, 90, 180, 365] as const;

type Props = {
  creatorHandle: string;
  creatorDisplayName: string;
  acceptingRequests: boolean;
  licensingNotes: string | null;
  publicProfileUrl: string;
};

export function LicenseRequestPanel({
  creatorHandle,
  creatorDisplayName,
  acceptingRequests,
  licensingNotes,
  publicProfileUrl,
}: Props) {
  const [brandName, setBrandName] = useState("");
  const [brandEmail, setBrandEmail] = useState("");
  const [brandCompany, setBrandCompany] = useState("");
  const [brandWebsite, setBrandWebsite] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [territories, setTerritories] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState<number>(30);
  const [budgetInr, setBudgetInr] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function toggle(list: string[], v: string, set: (n: string[]) => void) {
    if (list.includes(v)) set(list.filter((x) => x !== v));
    else set([...list, v]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError("Confirm the legal checkboxes below before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const budget_inr =
        budgetInr.trim() === "" ? undefined : parseInt(budgetInr.replace(/\D/g, ""), 10);
      const res = await fetch("/api/licenses/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_handle: creatorHandle,
          brand_email: brandEmail.trim(),
          brand_name: brandName.trim(),
          brand_company: brandCompany.trim() || undefined,
          brand_website: brandWebsite.trim() || undefined,
          intended_use: intendedUse.trim(),
          channels,
          territories,
          duration_days: durationDays,
          budget_inr: Number.isFinite(budget_inr) ? budget_inr : undefined,
          accept_terms: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = data as { error?: string | { message?: string } };
        const msg =
          typeof err.error === "string"
            ? err.error
            : err.error && typeof err.error === "object" && typeof err.error.message === "string"
              ? err.error.message
              : res.status === 429
                ? "Too many requests. Try again later."
                : "Request failed";
        setError(msg);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!acceptingRequests) {
    return (
      <p className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-900/70">
        This creator is not accepting license requests right now.
      </p>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
        <p className="font-medium">
          Request sent to {creatorDisplayName}. They&apos;ll see it in their Muhr dashboard.
        </p>
        <p className="mt-2 text-neutral-900/75">
          Brand-side request tracking will be available soon. The creator may reply to you at the email address you
          entered above.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-black/10 bg-white p-5 text-neutral-950 shadow-sm"
    >
      <h2 className="text-lg font-medium">Request a license</h2>
      <p className="text-sm text-neutral-900/60">No account required. The creator will respond by email.</p>

      <div className="rounded-lg border border-black/10 bg-neutral-50 p-4 text-sm text-neutral-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-900/55">Before you apply</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-neutral-800">
          <li>
            Read Muhr&apos;s{" "}
            <Link href="/terms" className="font-medium text-neutral-950 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-neutral-950 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </Link>
            .
          </li>
          <li>
            This page is the creator&apos;s public profile:{" "}
            <a href={publicProfileUrl} className="font-medium text-neutral-950 underline underline-offset-2">
              {publicProfileUrl}
            </a>
            .
          </li>
        </ul>
        {licensingNotes ? (
          <div className="mt-3 border-t border-black/10 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-900/55">
              Notes from @{creatorHandle}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-neutral-900">{licensingNotes}</p>
          </div>
        ) : (
          <p className="mt-3 border-t border-black/10 pt-3 text-xs text-neutral-700">
            This creator has not added custom licensing notes. Standard Muhr marketplace terms apply; you can still
            negotiate details with them after they respond.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-900/70">Your name</label>
        <input
          required
          minLength={2}
          maxLength={100}
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-900/40"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-900/70">Email (we&apos;ll send the response here)</label>
        <input
          required
          type="email"
          value={brandEmail}
          onChange={(e) => setBrandEmail(e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-900/40"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-900/70">Company</label>
        <input
          required
          maxLength={100}
          value={brandCompany}
          onChange={(e) => setBrandCompany(e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-900/40"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-900/70">Website (optional)</label>
        <input
          type="url"
          placeholder="https://"
          value={brandWebsite}
          onChange={(e) => setBrandWebsite(e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-900/40"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-900/70">Describe intended use (40+ characters)</label>
        <textarea
          required
          minLength={40}
          maxLength={2000}
          rows={4}
          value={intendedUse}
          onChange={(e) => setIntendedUse(e.target.value)}
          placeholder="e.g., 30-second product demo for our fitness app…"
          className="w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-900/40"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-neutral-900/70">Channels (pick at least one)</p>
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggle(channels, c, setChannels)}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                channels.includes(c)
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-black/10 bg-neutral-50 text-neutral-900/70 hover:border-black/20"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-neutral-900/70">Territories (pick at least one)</p>
        <div className="flex flex-wrap gap-1.5">
          {TERRITORIES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(territories, t, setTerritories)}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                territories.includes(t)
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-black/10 bg-neutral-50 text-neutral-900/70 hover:border-black/20"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-neutral-900/70">Duration</p>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <label key={d} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-900">
              <input
                type="radio"
                name="dur"
                checked={durationDays === d}
                onChange={() => setDurationDays(d)}
                className="accent-neutral-950"
              />
              {d} days
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-900/70">Budget (INR, optional)</label>
        <input
          inputMode="numeric"
          value={budgetInr}
          onChange={(e) => setBudgetInr(e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-900/40"
          placeholder="Leave blank to negotiate"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 bg-neutral-50 p-3 text-sm text-neutral-900">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="accent-neutral-950 mt-0.5"
        />
        <span>
          I have read the Muhr{" "}
          <Link href="/terms" className="font-medium underline underline-offset-2" target="_blank" rel="noopener noreferrer">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium underline underline-offset-2" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </Link>
          , any licensing notes from this creator on this page, and I confirm the information I enter is accurate. I
          understand this request will be shared with the creator and Muhr operations so the request can be processed.
        </span>
      </label>

      <button
        type="submit"
        disabled={submitting || !acceptTerms}
        className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
