"use client";

import { useCallback, useEffect, useState } from "react";
import { ProfileBasicsForm } from "@/components/profile/ProfileBasicsForm";
import { formatFollowerCount } from "@/lib/pricing/followers";
import { parsePhoneE164 } from "@/lib/profile/basics";

interface ProfileOverviewSectionProps {
  onUpdated?: () => void;
}

export function ProfileOverviewSection({ onUpdated }: ProfileOverviewSectionProps) {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
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
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(values: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    addressCity: string;
    addressPinCode: string;
    followerCount: number;
  }) {
    setSaveError(null);
    setSaveOk(false);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: values.fullName,
        phone: values.phone,
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        addressCity: values.addressCity,
        addressPinCode: values.addressPinCode,
        followerCount: values.followerCount,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setSaveError(typeof data.error === "string" ? data.error : "Could not save");
      throw new Error("save failed");
    }
    setOverview({
      fullName: values.fullName,
      phone: values.phone,
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2,
      addressCity: values.addressCity,
      addressPinCode: values.addressPinCode,
      followerCount: values.followerCount,
    });
    setEditing(false);
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 2500);
    onUpdated?.();
    await load();
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
            Contact details and audience size used for licensing estimates.
          </p>
        </div>
        {!loading && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
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
          Profile overview saved.
        </p>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <div className="h-32 animate-pulse rounded-lg bg-black/5" />
        ) : editing ? (
          <ProfileBasicsForm
            initial={overview}
            submitLabel="Save overview"
            onSubmit={handleSave}
          />
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <OverviewItem label="Name" value={overview.fullName || "—"} />
            <OverviewItem label="Phone" value={phoneDisplay} />
            <OverviewItem label="Address line 1" value={overview.addressLine1 || "—"} className="sm:col-span-2" />
            {overview.addressLine2 ? (
              <OverviewItem label="Address line 2" value={overview.addressLine2} className="sm:col-span-2" />
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
          </dl>
        )}
        {editing ? (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setSaveError(null);
            }}
            className="mt-3 text-sm font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

function OverviewItem({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-1 text-sm text-neutral-950">{value}</dd>
    </div>
  );
}
