"use client";

import { useCallback, useEffect, useState } from "react";
import { BrandProfileForm } from "./BrandProfileForm";
import { Alert } from "@/components/ui/alert";
import { LoadingSkeleton } from "@/components/ui/loading";
import { apiErrorMessage, dataFromApiJson } from "@/lib/api/response";
import {
  BRAND_PROFILE_MIGRATION_HINT,
  type BrandProfileValues,
  type BrandVerificationDocument,
} from "@/lib/brand/profile";

type ProfilePayload = {
  profile: Partial<BrandProfileValues>;
  documents: BrandVerificationDocument[];
};

export default function BrandProfilePageClient() {
  const [initial, setInitial] = useState<Partial<BrandProfileValues> | null>(null);
  const [documents, setDocuments] = useState<BrandVerificationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/brand/profile");
      const json = await res.json();

      if (!res.ok || !json.ok) {
        const message =
          json?.error?.code === "migration_required"
            ? BRAND_PROFILE_MIGRATION_HINT
            : apiErrorMessage(json, "Failed to load profile");
        setLoadError(message);
        setInitial({});
        setDocuments([]);
        return;
      }

      const data = dataFromApiJson<ProfilePayload>(json);
      setInitial(data?.profile ?? {});
      setDocuments(data?.documents ?? []);
    } catch {
      setLoadError("Failed to load profile");
      setInitial({});
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleSubmit(values: BrandProfileValues) {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/brand/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(apiErrorMessage(json, "Save failed"));
      }
      setSaved(true);
      setInitial(values);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="space-y-4" aria-busy="true" aria-label="Loading profile">
        <LoadingSkeleton variant="rect" height={120} className="rounded-2xl" />
        <LoadingSkeleton variant="rect" height={220} className="rounded-2xl" />
        <LoadingSkeleton variant="rect" height={180} className="rounded-2xl" />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {loadError ? (
        <Alert variant="warning" title="Profile unavailable">
          {loadError.includes("migration") || loadError.includes("032")
            ? BRAND_PROFILE_MIGRATION_HINT
            : loadError}
        </Alert>
      ) : null}

      {saved ? <Alert variant="success">Profile saved.</Alert> : null}

      <BrandProfileForm
        initial={initial ?? undefined}
        documents={documents}
        onSubmit={handleSubmit}
        onDocumentsChange={setDocuments}
        busy={busy}
      />
    </section>
  );
}
