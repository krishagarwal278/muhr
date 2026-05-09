"use client";

import { useMemo, useState } from "react";

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
};

export function LicenseRequestPanel({ creatorHandle, creatorDisplayName, acceptingRequests }: Props) {
  const [brandName, setBrandName] = useState("");
  const [brandEmail, setBrandEmail] = useState("");
  const [brandCompany, setBrandCompany] = useState("");
  const [brandWebsite, setBrandWebsite] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [territories, setTerritories] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState<number>(30);
  const [budgetInr, setBudgetInr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ token: string } | null>(null);

  const appOrigin = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "",
    []
  );

  function toggle(list: string[], v: string, set: (n: string[]) => void) {
    if (list.includes(v)) set(list.filter((x) => x !== v));
    else set([...list, v]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Request failed");
        return;
      }
      setDone({ token: data.request_token });
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

  if (done) {
    const trackUrl = `${appOrigin}/r/${done.token}`;
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
        <p className="font-medium">
          Request sent to {creatorDisplayName}. They&apos;ll see it in their Muhr dashboard.
        </p>
        <p className="mt-2 text-neutral-900/75">
          {/* TODO: brand tracking page */}
          Track (coming soon):{" "}
          <span className="break-all font-mono text-xs text-neutral-950">{trackUrl}</span>
        </p>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(trackUrl)}
          className="mt-3 rounded-lg bg-white px-4 py-2 text-xs font-medium text-black hover:opacity-90"
        >
          Copy tracking link
        </button>
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

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
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

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
