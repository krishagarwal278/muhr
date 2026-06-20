"use client";

import { useCallback, useEffect, useState } from "react";
import { formatFollowerCount } from "@/lib/pricing/followers";
import { parsePhoneE164 } from "@/lib/profile/basics";
import { getPublicShareableSiteBase } from "@/lib/app/publicSiteUrl";
import { profileApiErrorMessage, profileFromApiJson } from "@/lib/api/profilePayload";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileLinksEditor } from "@/components/profile/ProfileLinksEditor";
import { ProfileLinksDisplay } from "@/components/profile/ProfileLinksDisplay";
import { SectionCard } from "@/components/ui/section-card";
import { Alert } from "@/components/ui/alert";
import { FormInput } from "@/components/ui/form-input";
import { FormField } from "@/components/ui/form-field";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormCheckbox } from "@/components/ui/form-checkbox";
import { FormSelect } from "@/components/ui/form-select";
import { DataItem, DataItemsGrid } from "@/components/ui/data-item";
import { LoadingSkeleton } from "@/components/ui/loading";
import { outlineButtonVariants, solidButtonVariants } from "@/components/ui/button-recipes";
import { validateProfileLinksBeforeSave, type ProfileLinkInput } from "@/lib/profile/links";

interface ProfileOverviewSectionProps {
  onUpdated?: () => void;
}

interface OverviewState {
  avatarUrl: string | null;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressPinCode: string;
  followerCount: number | null;
  handle: string;
  email: string;
  licensingNotes: string;
  acceptingRequests: boolean;
  profileLinks: ProfileLinkInput[];
}

interface EditState {
  fullName: string;
  countryCode: string;
  localPhone: string;
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressPinCode: string;
  followerText: string;
  handle: string;
  licensingNotes: string;
  acceptingRequests: boolean;
  profileLinks: ProfileLinkInput[];
}

const INITIAL_OVERVIEW: OverviewState = {
  avatarUrl: null,
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  addressCity: "",
  addressPinCode: "",
  followerCount: null,
  handle: "",
  email: "",
  licensingNotes: "",
  acceptingRequests: true,
  profileLinks: [],
};

export function ProfileOverviewSection({ onUpdated }: ProfileOverviewSectionProps) {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [overview, setOverview] = useState<OverviewState>(INITIAL_OVERVIEW);
  const [editValues, setEditValues] = useState<EditState>({
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
    profileLinks: [],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      const data = profileFromApiJson(await res.json().catch(() => null));
      if (res.ok && data) {
        setOverview({
          avatarUrl: data.avatarUrl ?? null,
          fullName: data.fullName ?? data.displayName ?? "",
          phone: data.phone ?? "",
          addressLine1: data.addressLine1 ?? data.address ?? "",
          addressLine2: data.addressLine2 ?? "",
          addressCity: data.addressCity ?? "",
          addressPinCode: data.addressPinCode ?? "",
          followerCount: typeof data.followerCount === "number" ? data.followerCount : null,
          handle: data.handle ?? "",
          email: data.email ?? "",
          licensingNotes: data.licensingNotes ?? "",
          acceptingRequests: data.acceptingRequests !== false,
          profileLinks: Array.isArray(data.profileLinks)
            ? data.profileLinks
                .map((item) => ({
                  platform: typeof item?.platform === "string" ? item.platform : "",
                  value: typeof item?.value === "string" ? item.value : "",
                }))
                .filter((item): item is ProfileLinkInput => !!item.platform && !!item.value)
            : [],
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
      profileLinks: overview.profileLinks,
    });
    setSaveError(null);
    setSaveOk(false);
    setEditing(true);
  }

  function updateEdit<K extends keyof EditState>(key: K, value: EditState[K]) {
    setEditValues((prev) => ({ ...prev, [key]: value }));
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

    const linksResult = validateProfileLinksBeforeSave(editValues.profileLinks);
    if (!linksResult.ok) {
      setSaveError(linksResult.error);
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
          profileLinks: linksResult.data,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(profileApiErrorMessage(json, "Could not save"));
        return;
      }
      const saved = profileFromApiJson(json);
      setOverview({
        avatarUrl: saved?.avatarUrl ?? overview.avatarUrl,
        fullName: editValues.fullName.trim(),
        phone,
        addressLine1: editValues.addressLine1.trim(),
        addressLine2: editValues.addressLine2.trim(),
        addressCity: editValues.addressCity.trim(),
        addressPinCode: editValues.addressPinCode.trim(),
        followerCount,
        handle: saved?.handle ?? editValues.handle.trim(),
        email: overview.email,
        licensingNotes: saved?.licensingNotes ?? editValues.licensingNotes.trim(),
        acceptingRequests: editValues.acceptingRequests,
        profileLinks: Array.isArray(saved?.profileLinks)
          ? saved.profileLinks
              .map((item) => ({
                platform: typeof item?.platform === "string" ? item.platform : "",
                value: typeof item?.value === "string" ? item.value : "",
              }))
              .filter((item): item is ProfileLinkInput => !!item.platform && !!item.value)
          : editValues.profileLinks,
      });
      setEditing(false);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
      onUpdated?.();
      void load();
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    setEditing(false);
    setSaveError(null);
  }

  const phoneDisplay = overview.phone
    ? parsePhoneE164(overview.phone).countryCode + " " + parsePhoneE164(overview.phone).localNumber
    : "—";
  const publicUrl = overview.handle ? `${getPublicShareableSiteBase()}/k/${overview.handle}` : "";

  return (
    <SectionCard
      id="profile-overview"
      title="Profile overview"
      className="scroll-mt-24"
      headerAction={
        !loading && !editing ? (
          <button type="button" onClick={startEditing} className={outlineButtonVariants()}>
            Edit
          </button>
        ) : null
      }
    >
      {saveError && <Alert variant="error" className="mb-4">{saveError}</Alert>}
      {saveOk && <Alert variant="success" className="mb-4">Profile saved.</Alert>}

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton height={32} />
          <LoadingSkeleton height={32} />
          <LoadingSkeleton height={32} />
        </div>
      ) : editing ? (
        <EditForm
          values={editValues}
          email={overview.email}
          avatarName={overview.fullName || overview.email || "User"}
          avatarUrl={overview.avatarUrl}
          onAvatarChange={(avatarUrl) => setOverview((o) => ({ ...o, avatarUrl }))}
          onUpdate={updateEdit}
          onSave={handleSave}
          onCancel={cancelEditing}
          saving={saving}
        />
      ) : (
        <>
          <ProfileOverviewHeader
            overview={overview}
            publicUrl={publicUrl}
            onAvatarChange={(avatarUrl) => setOverview((o) => ({ ...o, avatarUrl }))}
          />
          <DisplayView overview={overview} phoneDisplay={phoneDisplay} />
        </>
      )}
    </SectionCard>
  );
}

interface ProfileOverviewHeaderProps {
  overview: OverviewState;
  publicUrl: string;
  onAvatarChange: (avatarUrl: string | null) => void;
}

function ProfileOverviewHeader({ overview, publicUrl, onAvatarChange }: ProfileOverviewHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
      <ProfileAvatar
        name={overview.fullName || overview.email || "User"}
        avatarUrl={overview.avatarUrl}
        size="lg"
        editable
        layout="inline"
        className="shrink-0"
        onAvatarChange={onAvatarChange}
      />
      <div className="min-w-0 space-y-0.5 sm:pt-1">
        <p className="text-base font-semibold text-neutral-950">{overview.fullName || "—"}</p>
        {overview.email ? <p className="text-sm text-neutral-700">{overview.email}</p> : null}
        {publicUrl ? <p className="break-all text-sm text-neutral-600">{publicUrl}</p> : null}
      </div>
    </div>
  );
}

interface EditFormProps {
  values: EditState;
  email: string;
  avatarName: string;
  avatarUrl: string | null;
  onAvatarChange: (avatarUrl: string | null) => void;
  onUpdate: <K extends keyof EditState>(key: K, value: EditState[K]) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

function EditForm({
  values,
  email,
  avatarName,
  avatarUrl,
  onAvatarChange,
  onUpdate,
  onSave,
  onCancel,
  saving,
}: EditFormProps) {
  return (
    <div className="space-y-4">
      <ProfileAvatar
        name={avatarName}
        avatarUrl={avatarUrl}
        size="lg"
        editable
        layout="inline"
        onAvatarChange={onAvatarChange}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" required>
          <FormInput
            value={values.fullName}
            onChange={(e) => onUpdate("fullName", e.target.value)}
            placeholder="Your full name"
          />
        </FormField>
        <FormField label="Phone" required>
          <div className="flex gap-2">
            <FormSelect
              value={values.countryCode}
              onChange={(e) => onUpdate("countryCode", e.target.value)}
              className="w-24"
            >
              <option value="+91">+91</option>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
            </FormSelect>
            <FormInput
              type="tel"
              value={values.localPhone}
              onChange={(e) => onUpdate("localPhone", e.target.value)}
              placeholder="9876543210"
              className="flex-1"
            />
          </div>
        </FormField>
      </div>

      <FormField label="Address line 1" required>
        <FormInput
          value={values.addressLine1}
          onChange={(e) => onUpdate("addressLine1", e.target.value)}
          placeholder="Flat, building name"
        />
      </FormField>

      <FormField label="Address line 2">
        <FormInput
          value={values.addressLine2}
          onChange={(e) => onUpdate("addressLine2", e.target.value)}
          placeholder="Area, landmark"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="City" required>
          <FormInput
            value={values.addressCity}
            onChange={(e) => onUpdate("addressCity", e.target.value)}
            placeholder="Mumbai"
          />
        </FormField>
        <FormField label="Pin code" required>
          <FormInput
            value={values.addressPinCode}
            onChange={(e) => onUpdate("addressPinCode", e.target.value)}
            placeholder="400001"
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Follower count" required>
          <FormInput
            value={values.followerText}
            onChange={(e) => onUpdate("followerText", e.target.value)}
            placeholder="e.g. 50K or 50000"
          />
        </FormField>
        <FormField
          label="Muhr handle"
          description="Your public URL slug. Used for your shareable Muhr link."
        >
          <FormInput
            value={values.handle}
            onChange={(e) => onUpdate("handle", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="your_handle"
            maxLength={30}
            font="mono"
          />
        </FormField>
      </div>

      <FormField
        label="Public profile links"
        description="Add your social profiles and website to show on your Muhr pass."
      >
        <ProfileLinksEditor
          value={values.profileLinks}
          onChange={(next) => onUpdate("profileLinks", next)}
        />
      </FormField>

      <FormField label="Email" description="Email changes are not supported yet.">
        <FormInput value={email} disabled className="bg-neutral-50" />
      </FormField>

      <FormField
        label="Licensing notes (shown to brands)"
        description="Edit these in Licenses → Rules and rates. Legacy field kept in sync when you save there."
      >
        <FormTextarea
          value={values.licensingNotes}
          onChange={(e) => onUpdate("licensingNotes", e.target.value)}
          maxLength={4000}
          rows={4}
          placeholder="e.g., Minimum fee, channels you won't do, typical turnaround…"
        />
      </FormField>

      <FormCheckbox
        checked={values.acceptingRequests}
        onChange={(e) => onUpdate("acceptingRequests", e.target.checked)}
        label="Accept license requests"
        description="Turn off to show brands you are not taking new requests"
      />

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className={solidButtonVariants()}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface DisplayViewProps {
  overview: OverviewState;
  phoneDisplay: string;
}

function DisplayView({ overview, phoneDisplay }: DisplayViewProps) {
  return (
    <DataItemsGrid columns={2} className="gap-x-6">
      <DataItem label="Phone" value={phoneDisplay} />
      <DataItem label="Address" value={overview.addressLine1 || "—"} />
      {overview.addressLine2 && (
        <DataItem label="Address line 2" value={overview.addressLine2} />
      )}
      <DataItem label="City" value={overview.addressCity || "—"} />
      <DataItem label="Pin code" value={overview.addressPinCode || "—"} />
      <DataItem
        label="Follower count"
        value={overview.followerCount ? formatFollowerCount(overview.followerCount) : "—"}
      />
      <DataItem
        label="Muhr handle"
        value={overview.handle ? `@${overview.handle}` : "—"}
      />
      <DataItem
        label="Accept license requests"
        value={overview.acceptingRequests ? "Yes" : "No"}
      />
      {overview.profileLinks.length > 0 ? (
        <div className="sm:col-span-2">
          <DataItem label="Public profile links" value={<ProfileLinksDisplay links={overview.profileLinks} variant="compact" />} />
        </div>
      ) : null}
      {overview.licensingNotes && (
        <div className="sm:col-span-2">
          <DataItem label="Licensing notes" value={overview.licensingNotes} />
        </div>
      )}
    </DataItemsGrid>
  );
}
