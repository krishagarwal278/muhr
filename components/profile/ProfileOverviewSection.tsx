"use client";

import { useCallback, useEffect, useState } from "react";
import { formatFollowerCount } from "@/lib/pricing/followers";
import { parsePhoneE164 } from "@/lib/profile/basics";

interface ProfileOverviewSectionProps {
  onUpdated?: () => void;
}

export function ProfileOverviewSection({ onUpdated }: ProfileOverviewSectionProps) {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [overview, setOverview] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    addressCity: "",
    addressPinCode: "",
    followerCount: null as number | null,
    handle: "",
    email: "",
    licensingNotes: "",
    acceptingRequests: true,
  });

  const [editValues, setEditValues] = useState({
    fullName: "",
    countryCode: "+91",
    localPhone: "",
    addressLine1: "",
    addressLine2: "",
    addressCity: "",
    addressPinCode: "",
    followerText: "",
    handle: "",
    licensingNotes: "",
    acceptingRequests: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      const data = (await res.json().catch(() => ({}))) as {
        fullName?: string | null;
        displayName?: string | null;
        phone?: string | null;
        address?: string | null;
        addressLine1?: string | null;
        addressLine2?: string | null;
        addressCity?: string | null;
        addressPinCode?: string | null;
        followerCount?: number | null;
        handle?: string | null;
        email?: string | null;
        licensingNotes?: string | null;
        acceptingRequests?: boolean;
      };
      if (res.ok) {
        setOverview({
          fullName: data.fullName ?? data.displayName ?? "",
          phone: data.phone ?? "",
          addressLine1: data.addressLine1 ?? data.address ?? "",
          addressLine2: data.addressLine2 ?? "",
          addressCity: data.addressCity ?? "",
          addressPinCode: data.addressPinCode ?? "",
          followerCount:
            typeof data.followerCount === "number" ? data.followerCount : null,
          handle: data.handle ?? "",
          email: data.email ?? "",
          licensingNotes: data.licensingNotes ?? "",
          acceptingRequests: data.acceptingRequests !== false,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEditing() {
    const parsed = overview.phone ? parsePhoneE164(overview.phone) : { countryCode: "+91", localNumber: "" };
    setEditValues({
      fullName: overview.fullName,
      countryCode: parsed.countryCode,
      localPhone: parsed.localNumber,
      addressLine1: overview.addressLine1,
      addressLine2: overview.addressLine2,
      addressCity: overview.addressCity,
      addressPinCode: overview.addressPinCode,
      followerText: overview.followerCount ? formatFollowerCount(overview.followerCount) : "",
      handle: overview.handle,
      licensingNotes: overview.licensingNotes,
      acceptingRequests: overview.acceptingRequests,
    });
    setSaveError(null);
    setSaveOk(false);
    setEditing(true);
  }

  function parseFollowerInput(raw: string): number | null {
    const s = raw.trim().toLowerCase();
    if (!s) return null;
    const mMatch = s.match(/^([\d.]+)\s*m$/);
    if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1_000_000);
    const kMatch = s.match(/^([\d.]+)\s*k$/);
    if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1_000);
    const n = parseInt(s.replace(/,/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  async function handleSave() {
    setSaveError(null);
    setSaveOk(false);

    if (!editValues.fullName.trim()) {
      setSaveError("Full name is required.");
      return;
    }
    if (!editValues.localPhone.trim()) {
      setSaveError("Phone number is required.");
      return;
    }
    if (!editValues.addressLine1.trim()) {
      setSaveError("Address is required.");
      return;
    }
    if (!editValues.addressCity.trim()) {
      setSaveError("City is required.");
      return;
    }
    if (!editValues.addressPinCode.trim()) {
      setSaveError("Pin code is required.");
      return;
    }
    const followerCount = parseFollowerInput(editValues.followerText);
    if (!followerCount) {
      setSaveError("Follower count is required.");
      return;
    }

    setSaving(true);
    try {
      const phone = editValues.countryCode + editValues.localPhone.replace(/\D/g, "");
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editValues.fullName.trim(),
          phone,
          addressLine1: editValues.addressLine1.trim(),
          addressLine2: editValues.addressLine2.trim(),
          addressCity: editValues.addressCity.trim(),
          addressPinCode: editValues.addressPinCode.trim(),
          followerCount,
          handle: editValues.handle.trim() || null,
          acceptingRequests: editValues.acceptingRequests,
          licensingNotes: editValues.licensingNotes.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; handle?: string; licensingNotes?: string };
      if (!res.ok) {
        setSaveError(typeof data.error === "string" ? data.error : "Could not save");
        return;
      }
      setOverview({
        fullName: editValues.fullName.trim(),
        phone,
        addressLine1: editValues.addressLine1.trim(),
        addressLine2: editValues.addressLine2.trim(),
        addressCity: editValues.addressCity.trim(),
        addressPinCode: editValues.addressPinCode.trim(),
        followerCount,
        handle: typeof data.handle === "string" ? data.handle : editValues.handle.trim(),
        email: overview.email,
        licensingNotes: typeof data.licensingNotes === "string" ? data.licensingNotes : editValues.licensingNotes.trim(),
        acceptingRequests: editValues.acceptingRequests,
      });
      setEditing(false);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
      onUpdated?.();
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const phoneDisplay = overview.phone
    ? parsePhoneE164(overview.phone).countryCode +
      " " +
      parsePhoneE164(overview.phone).localNumber
    : "—";

  return (
    <div
      id="profile-overview"
      className="scroll-mt-24 rounded-xl border border-black/10 bg-white p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-neutral-950">Profile overview</h2>
          <p className="mt-1 text-sm text-neutral-700">
            {overview.handle && (
              <span className="block mt-1">
                Public URL: <span className="font-mono font-medium text-neutral-900">/k/{overview.handle}</span>
              </span>
            )}
          </p>
        </div>
        {!loading && !editing ? (
          <button
            type="button"
            onClick={startEditing}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            Edit
          </button>
        ) : null}
      </div>

      {saveError ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {saveError}
        </p>
      ) : null}
      {saveOk ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          Profile saved.
        </p>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <div className="h-32 animate-pulse rounded-lg bg-black/5" />
        ) : editing ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-900">Full name <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  value={editValues.fullName}
                  onChange={(e) => setEditValues({ ...editValues, fullName: e.target.value })}
                  className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none focus:border-black/15"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-900">Phone <span className="text-red-600">*</span></label>
                <div className="flex gap-2">
                  <select
                    value={editValues.countryCode}
                    onChange={(e) => setEditValues({ ...editValues, countryCode: e.target.value })}
                    className="w-20 rounded-lg border border-black/10 bg-white px-2 py-2.5 text-sm text-neutral-950 outline-none"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                  </select>
                  <input
                    type="tel"
                    value={editValues.localPhone}
                    onChange={(e) => setEditValues({ ...editValues, localPhone: e.target.value })}
                    className="flex-1 rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none focus:border-black/15"
                    placeholder="9876543210"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900">Address line 1 <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={editValues.addressLine1}
                onChange={(e) => setEditValues({ ...editValues, addressLine1: e.target.value })}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none focus:border-black/15"
                placeholder="Flat, building name"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900">Address line 2</label>
              <input
                type="text"
                value={editValues.addressLine2}
                onChange={(e) => setEditValues({ ...editValues, addressLine2: e.target.value })}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none focus:border-black/15"
                placeholder="Area, landmark"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-900">City <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  value={editValues.addressCity}
                  onChange={(e) => setEditValues({ ...editValues, addressCity: e.target.value })}
                  className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none focus:border-black/15"
                  placeholder="Mumbai"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-900">Pin code <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  value={editValues.addressPinCode}
                  onChange={(e) => setEditValues({ ...editValues, addressPinCode: e.target.value })}
                  className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none focus:border-black/15"
                  placeholder="400001"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-900">Follower count <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  value={editValues.followerText}
                  onChange={(e) => setEditValues({ ...editValues, followerText: e.target.value })}
                  className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none focus:border-black/15"
                  placeholder="e.g. 50K or 50000"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-900">Instagram handle</label>
                <input
                  type="text"
                  value={editValues.handle}
                  onChange={(e) => setEditValues({ ...editValues, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                  className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 font-mono text-sm text-neutral-950 outline-none focus:border-black/15"
                  placeholder="your_handle"
                  maxLength={30}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900">Email</label>
              <input
                type="email"
                value={overview.email}
                className="w-full rounded-lg border border-black/10 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-950 outline-none"
                disabled
              />
              <p className="mt-1 text-xs text-neutral-600">Email changes are not supported yet.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900">Licensing notes (shown to brands)</label>
              <textarea
                value={editValues.licensingNotes}
                onChange={(e) => setEditValues({ ...editValues, licensingNotes: e.target.value })}
                maxLength={4000}
                rows={4}
                placeholder="e.g., Minimum fee, channels you won't do, typical turnaround…"
                className="w-full resize-y rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none focus:border-black/15"
              />
              <p className="mt-1 text-xs text-neutral-600">
                Optional. Shown on your public page before brands submit a license request.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={editValues.acceptingRequests}
                onChange={(e) => setEditValues({ ...editValues, acceptingRequests: e.target.checked })}
                className="accent-neutral-950"
              />
              <span>
                <span className="block text-sm font-medium text-neutral-950">Accept license requests</span>
                <span className="text-xs text-neutral-600">Turn off to show brands you are not taking new requests</span>
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setSaveError(null);
                }}
                className="text-sm font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <OverviewItem label="Name" value={overview.fullName || "—"} />
            <OverviewItem label="Phone" value={phoneDisplay} />
            <OverviewItem label="Email" value={overview.email || "—"} />
            <OverviewItem label="Address" value={overview.addressLine1 || "—"} />
            {overview.addressLine2 ? (
              <OverviewItem label="Address line 2" value={overview.addressLine2} />
            ) : null}
            <OverviewItem label="City" value={overview.addressCity || "—"} />
            <OverviewItem label="Pin code" value={overview.addressPinCode || "—"} />
            <OverviewItem
              label="Follower count"
              value={
                overview.followerCount
                  ? formatFollowerCount(overview.followerCount)
                  : "—"
              }
            />
            <OverviewItem label="Instagram handle" value={overview.handle ? `@${overview.handle}` : "—"} />
            <OverviewItem label="Accept license requests" value={overview.acceptingRequests ? "Yes" : "No"} />
            <OverviewItem
              label="Licensing notes"
              value={overview.licensingNotes || "—"}
              className="sm:col-span-2"
              multiline
            />
          </dl>
        )}
      </div>
    </div>
  );
}

function OverviewItem({
  label,
  value,
  className = "",
  multiline = false,
}: {
  label: string;
  value: string;
  className?: string;
  multiline?: boolean;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className={`mt-1 text-sm text-neutral-950 ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</dd>
    </div>
  );
}
