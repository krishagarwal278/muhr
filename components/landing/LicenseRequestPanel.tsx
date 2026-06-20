"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FeeRecommendation } from "@/components/license/FeeRecommendation";
import { solidButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";
import { formatIntegerWithCommas } from "@/lib/format/numberInput";
import { formatNumberFieldChange } from "@/components/ui/form-number-input";
import {
  type CreatorRequestConstraints,
  permittedRequestChannels,
  permittedRequestDurations,
  permittedRequestTerritories,
  validateRequestAgainstConstraints,
} from "@/lib/license/requestOptions";

type Props = {
  creatorHandle: string;
  creatorDisplayName: string;
  acceptingRequests: boolean;
  licensingNotes: string | null;
  otherUsageNotes?: string | null;
  licenseRegions?: string[];
  requestConstraints: CreatorRequestConstraints;
  publicProfileUrl: string;
  /** When signed into the brand workspace, we bind the request to this email (read-only in the form). */
  signedInBrandEmail?: string | null;
  /**
   * Creator-stated minimum fee, used to anchor the fee recommendation. Optional —
   * the engine has sensible defaults when this isn't available.
   */
  creatorMinLicenseFeeInr?: number | null;
};

export function LicenseRequestPanel({
  creatorHandle,
  creatorDisplayName,
  acceptingRequests,
  licensingNotes,
  otherUsageNotes = null,
  licenseRegions = [],
  requestConstraints: initialConstraints,
  publicProfileUrl,
  signedInBrandEmail = null,
  creatorMinLicenseFeeInr = null,
}: Props) {
  const router = useRouter();
  const lockedBrandEmail = signedInBrandEmail?.trim() ?? "";
  const brandWorkspaceSignedIn = Boolean(lockedBrandEmail);
  const [constraints, setConstraints] = useState(initialConstraints);
  const [brandName, setBrandName] = useState("");
  const [brandEmail, setBrandEmail] = useState("");
  const [brandCompany, setBrandCompany] = useState("");
  const [brandWebsite, setBrandWebsite] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [territories, setTerritories] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState<number>(initialConstraints.defaultDurationDays);
  const [budgetInr, setBudgetInr] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const effectiveBrandEmail = brandWorkspaceSignedIn ? lockedBrandEmail : brandEmail;

  const refreshConstraints = useCallback(async () => {
    try {
      const res = await fetch(`/api/public-profile/${encodeURIComponent(creatorHandle)}/request-options`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.ok !== true || !json.data) return;
      setConstraints(json.data as CreatorRequestConstraints);
    } catch {
      // keep current constraints
    }
  }, [creatorHandle]);

  useEffect(() => {
    setConstraints(initialConstraints);
  }, [initialConstraints]);

  useEffect(() => {
    void refreshConstraints();
    const onFocus = () => void refreshConstraints();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshConstraints]);

  const availableChannels = useMemo(() => permittedRequestChannels(constraints), [constraints]);
  const availableTerritories = useMemo(
    () => permittedRequestTerritories(constraints),
    [constraints]
  );
  const availableDurations = useMemo(
    () => [...permittedRequestDurations(constraints)],
    [constraints]
  );
  const requestsOpen = availableChannels.length > 0 && availableTerritories.length > 0;

  useEffect(() => {
    const allowedChannels = new Set(availableChannels);
    setChannels((prev) => prev.filter((c) => allowedChannels.has(c as (typeof availableChannels)[number])));

    const allowedTerritories = new Set(availableTerritories);
    setTerritories((prev) => prev.filter((t) => allowedTerritories.has(t)));

    setDurationDays((prev) =>
      availableDurations.includes(prev) ? prev : constraints.defaultDurationDays
    );
  }, [constraints, availableChannels, availableTerritories, availableDurations, constraints.defaultDurationDays]);

  function toggleAllowed(
    allowed: readonly string[],
    list: string[],
    value: string,
    set: (next: string[]) => void
  ) {
    if (!allowed.includes(value)) return;
    if (list.includes(value)) set(list.filter((x) => x !== value));
    else set([...list, value]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError("Confirm the legal checkboxes below before submitting.");
      return;
    }
    const ruleCheck = validateRequestAgainstConstraints(constraints, {
      channels,
      territories,
      durationDays,
    });
    if (!ruleCheck.ok) {
      setError(ruleCheck.message);
      return;
    }
    setSubmitting(true);
    try {
      const budget_inr =
        budgetInr.trim() === "" ? undefined : parseInt(budgetInr.replace(/\D/g, ""), 10);
      const res = await fetch("/api/licenses/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_handle: creatorHandle,
          brand_email: effectiveBrandEmail.trim(),
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
      if (brandWorkspaceSignedIn) {
        router.refresh();
      }
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
        {brandWorkspaceSignedIn ? (
          <>
            <p className="mt-2 text-neutral-900/75">
              Track status on your brand dashboard (linked to{" "}
              <span className="font-mono text-[13px]">{lockedBrandEmail}</span>).
            </p>
            <Link
              href="/brand/dashboard"
              className={cx(solidButtonVariants(), "mt-4 inline-flex")}
            >
              Open brand dashboard →
            </Link>
          </>
        ) : (
          <p className="mt-2 text-neutral-900/75">
            We emailed a copy of your request to{" "}
            <span className="font-medium">{effectiveBrandEmail}</span>. The creator may reply there, and
            your requests will appear on your brand dashboard once you sign up with the same email.
          </p>
        )}
      </div>
    );
  }

  const creatorNotes = otherUsageNotes?.trim() || licensingNotes?.trim() || null;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-black/10 bg-white p-5 text-neutral-950 shadow-sm"
    >
      <h2 className="text-lg font-medium">Request a license</h2>
      <p className="text-sm text-neutral-900/60">
        {brandWorkspaceSignedIn
          ? "Signed in to your brand workspace — this request will appear on your brand dashboard."
          : "No account required. The creator will respond by email."}
      </p>

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
        {creatorNotes ? (
          <div className="mt-3 border-t border-black/10 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-900/55">
              Notes from @{creatorHandle}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-neutral-900">{creatorNotes}</p>
          </div>
        ) : null}
        {licenseRegions.length > 0 ? (
          <div className="mt-3 border-t border-black/10 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-900/55">
              User permitted regions
            </p>
            <p className="mt-2 text-neutral-900">{licenseRegions.join(", ")}</p>
          </div>
        ) : null}
        {!creatorNotes && licenseRegions.length === 0 ? (
          <p className="mt-3 border-t border-black/10 pt-3 text-xs text-neutral-700">
            This creator has not added custom licensing notes. Standard Muhr marketplace terms apply; you can still
            negotiate details with them after they respond.
          </p>
        ) : null}
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
        <label className="mb-1 block text-xs font-medium text-neutral-900/70">
          {brandWorkspaceSignedIn ? "Brand account email" : "Email (we&apos;ll send the response here)"}
        </label>
        <input
          required
          type="email"
          readOnly={brandWorkspaceSignedIn}
          value={effectiveBrandEmail}
          onChange={(e) => {
            if (!brandWorkspaceSignedIn) setBrandEmail(e.target.value);
          }}
          className={`w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-900/40 ${
            brandWorkspaceSignedIn ? "cursor-default bg-neutral-100" : "bg-white"
          }`}
        />
        {brandWorkspaceSignedIn ? (
          <p className="mt-1 text-xs text-neutral-600">
            Must match your brand sign-in so requests show on your dashboard.
          </p>
        ) : null}
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
        {!requestsOpen ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            This creator has not opened any channels for license requests right now.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {availableChannels.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleAllowed(availableChannels, channels, c, setChannels)}
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
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-neutral-900/70">User permitted regions (pick at least one)</p>
        {!requestsOpen ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            This creator has not opened any regions for license requests right now.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {availableTerritories.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleAllowed(availableTerritories, territories, t, setTerritories)}
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
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-neutral-900/70">Duration</p>
        <div className="flex flex-wrap gap-2">
          {availableDurations.map((d) => (
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
          onChange={(e) => setBudgetInr(formatNumberFieldChange(e.target.value))}
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-900/40"
          placeholder="Leave blank to negotiate"
        />
      </div>

      <FeeRecommendation
        anchor={{ minLicenseFeeInr: creatorMinLicenseFeeInr }}
        params={{
          durationDays: durationDays,
          channels: channels,
          territories: territories,
        }}
        onUseMid={(inr) => setBudgetInr(formatIntegerWithCommas(inr))}
        onUseLow={(inr) => setBudgetInr(formatIntegerWithCommas(inr))}
        onUseHigh={(inr) => setBudgetInr(formatIntegerWithCommas(inr))}
      />

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
        disabled={submitting || !acceptTerms || !requestsOpen}
        className={cx(solidButtonVariants({ size: "lg" }), "w-full")}
      >
        {submitting ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
