"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProfileBasicsForm } from "@/components/profile/ProfileBasicsForm";
import { surfaceCardVariants } from "@/components/ui/surface-card";
import { profileApiErrorMessage, profileFromApiJson } from "@/lib/api/profilePayload";

export function ProfileBasicsOnboarding({ userId }: { userId: string }) {
  const router = useRouter();
  const [initial, setInitial] = useState<{
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    addressCity: string;
    addressPinCode: string;
    followerCount: number | null;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = profileFromApiJson(await res.json().catch(() => null));
        if (!res.ok || !data) {
          if (!cancelled) setLoadError("Could not load your profile.");
          return;
        }
        if (data.profileBasicsComplete) {
          router.replace("/dashboard");
          return;
        }
        if (!cancelled) {
          setInitial({
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
      } catch {
        if (!cancelled) setLoadError("Could not load your profile.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, userId]);

  async function handleSubmit(values: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    addressCity: string;
    addressPinCode: string;
    followerCount: number;
    platformLicenseSigned?: boolean;
  }) {
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
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(profileApiErrorMessage(json, "Could not save"));
    }

    if (values.platformLicenseSigned) {
      await fetch("/api/profile/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformLicenseSigned: true }),
      });
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Step 1 of onboarding
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          Tell us about yourself
        </h1>
        <p className="mt-2 text-sm text-neutral-700">
          We need a few details before your guided tour. You can update these anytime in Profile.
          Your Muhr pass and share link are created automatically from your account username.
        </p>
      </div>

      <div className={surfaceCardVariants({ padding: "md" })}>
        {loadError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {loadError}
          </p>
        ) : initial ? (
          <ProfileBasicsForm
            initial={initial}
            submitLabel="Save and continue"
            onSubmit={handleSubmit}
            showLicenseCheckbox
          />
        ) : (
          <div className="space-y-3 py-6">
            <div className="h-10 animate-pulse rounded-lg bg-black/5" />
            <div className="h-10 animate-pulse rounded-lg bg-black/5" />
            <div className="h-24 animate-pulse rounded-lg bg-black/5" />
            <div className="h-10 animate-pulse rounded-lg bg-black/5" />
          </div>
        )}
      </div>
    </div>
  );
}