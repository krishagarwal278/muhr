"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KycStatusBadge } from "@/components/KycStatusBadge";
import type { KycStatus } from "@/types";
import { profileFromApiJson } from "@/lib/api/profilePayload";
import { MIN_CHARACTER_PHOTOS } from "@/lib/profile/completion";
import { outlineButtonVariants, solidButtonVariants } from "@/components/ui/button-recipes";

interface ManualIdentityVerificationProps {
  kycStatus: KycStatus;
  onStatusChange: (status: KycStatus) => void;
}

export function ManualIdentityVerification({
  kycStatus,
  onStatusChange,
}: ManualIdentityVerificationProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [characterPhotoCount, setCharacterPhotoCount] = useState<number | null>(null);
  const [handle, setHandle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [profileRes, photosRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/profile/character-photos"),
      ]);
      const profileData = profileFromApiJson(await profileRes.json().catch(() => null));
      const photosData = photosRes.ok ? await photosRes.json().catch(() => null) : null;

      if (!cancelled) {
        if (profileRes.ok && profileData) {
          setHandle(typeof profileData.handle === "string" && profileData.handle.trim() ? profileData.handle.trim() : null);
        }
        if (photosRes.ok && photosData?.data) {
          setCharacterPhotoCount(typeof photosData.data.count === "number" ? photosData.data.count : 0);
        } else if (photosRes.ok && photosData) {
          setCharacterPhotoCount(typeof photosData.count === "number" ? photosData.count : 0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitForReview() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/identity/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        const errorMsg = data.error?.message ?? data.error;
        setError(typeof errorMsg === "string" ? errorMsg : "Could not submit request");
        return;
      }
      onStatusChange("pending");
      setSuccessMsg(
        typeof data.message === "string"
          ? data.message
          : typeof data.data?.message === "string"
            ? data.data.message
            : "Thanks — our team will review your photos and reach out if needed."
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (kycStatus === "verified") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        Your identity is verified. You can upload vault assets and use licensing workflows.
      </div>
    );
  }

  if (kycStatus === "pending" || successMsg) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-amber-200/80 bg-amber-50/50 px-6 py-10 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-7 w-7 text-amber-800" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-amber-950">Review in progress</h3>
        <p className="mt-2 max-w-md text-sm text-amber-900/80">
          {successMsg ??
            "Our team is reviewing your character photos, public profile, and account details. We may contact you to confirm anything."}
        </p>
        <KycStatusBadge status="pending" className="mt-4" />
      </div>
    );
  }

  const characterPhotosComplete =
    characterPhotoCount != null && characterPhotoCount >= MIN_CHARACTER_PHOTOS;
  const canSubmit = characterPhotosComplete && handle != null;
  const requirementsLoaded = characterPhotoCount != null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm text-sky-950">
        <p className="font-medium">Identity verification</p>
        <p className="mt-1 text-sky-900/90">
          Upload {MIN_CHARACTER_PHOTOS} high-quality character photos in{" "}
          <Link href="/profile#complete-profile" className="font-medium underline-offset-2 hover:underline">
            Complete your profile
          </Link>
          , then submit here. Our team reviews your photos, Muhr handle, and profile details before approving
          verification.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}

      <ul className="space-y-2 text-sm text-neutral-800">
        <ChecklistItem
          done={characterPhotosComplete}
          label={`${MIN_CHARACTER_PHOTOS} character photos uploaded for review`}
          hint={
            characterPhotoCount != null
              ? `${characterPhotoCount} of ${MIN_CHARACTER_PHOTOS} uploaded`
              : "Upload in Complete your profile"
          }
        />
        <ChecklistItem
          done={handle != null}
          label="Muhr handle set"
          hint={handle ? `@${handle}` : "Created automatically when your profile loads"}
        />
      </ul>

      {!canSubmit && requirementsLoaded ? (
        <p className="text-sm text-neutral-600">Complete the items above to submit for review.</p>
      ) : null}

      {canSubmit ? (
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submitForReview()}
          className={solidButtonVariants({ size: "lg" })}
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      ) : (
        <Link
          href={characterPhotosComplete ? "/profile#profile-overview" : "/profile#complete-profile"}
          className={outlineButtonVariants({ size: "lg" })}
        >
          {characterPhotosComplete ? "Complete remaining steps" : "Upload character photos"}
        </Link>
      )}
    </div>
  );
}

function ChecklistItem({
  done,
  label,
  hint,
}: {
  done: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
          done ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-500"
        }`}
        aria-hidden
      >
        {done ? "✓" : "·"}
      </span>
      <span>
        {label}
        {hint ? <span className="mt-0.5 block text-xs text-neutral-500">{hint}</span> : null}
      </span>
    </li>
  );
}
