"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { KycStatusBadge } from "@/components/KycStatusBadge";
import { ManualIdentityVerification } from "@/components/identity/ManualIdentityVerification";
import { CompleteProfileSection } from "@/components/profile/CompleteProfileSection";
import { ProfileOverviewSection } from "@/components/profile/ProfileOverviewSection";
import { PhysicalMeasurementsSection } from "@/components/profile/PhysicalMeasurementsSection";
import { ProfileCompletionCard } from "@/components/profile/ProfileCompletionCard";
import type { ProfileCompletionItem } from "@/lib/profile/completion";
import type { KycStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { buildPasswordResetRedirectTo } from "@/lib/auth/passwordResetRedirect";
import { completionFromApiJson } from "@/lib/api/profilePayload";
import { dangerButtonVariants, ghostButtonVariants } from "@/components/ui/button-recipes";

type ProfileTab = "profile" | "identity" | "security";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "identity", label: "Identity" },
  { id: "security", label: "Security" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [profilePercent, setProfilePercent] = useState(0);
  const [profileItems, setProfileItems] = useState<ProfileCompletionItem[]>([]);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const refreshCompletion = useCallback(async () => {
    const res = await fetch("/api/profile/completion");
    if (res.ok) {
      const c = completionFromApiJson(await res.json().catch(() => null));
      if (c) {
        setProfilePercent(c.percent);
        setProfileItems(c.items as ProfileCompletionItem[]);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [idRes, completionRes] = await Promise.all([
          fetch("/api/identity"),
          fetch("/api/profile/completion"),
        ]);
        const idData = idRes.ok ? await idRes.json() : {};
        const identity = idData.data ?? idData;
        if (!cancelled) {
          setKycStatus((identity.kycStatus as KycStatus) ?? "unverified");
        }
        if (completionRes.ok && !cancelled) {
          const c = completionFromApiJson(await completionRes.json().catch(() => null));
          if (c) {
            setProfilePercent(c.percent);
            setProfileItems(c.items as ProfileCompletionItem[]);
          }
        }
      } catch {
        if (!cancelled) setKycStatus("unverified");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function sendPasswordReset() {
    setResetBusy(true);
    setResetMsg(null);
    setResetErr(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user?.email) {
        setResetErr("Could not load your account email. Sign out and use \"Forgot password?\" on the login page.");
        return;
      }
      const redirectTo = buildPasswordResetRedirectTo(window.location.origin);
      const { error: reqErr } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo });
      if (reqErr) {
        setResetErr(reqErr.message);
        return;
      }
      setResetMsg("If your address matches this account, you will receive an email with a link to set a new password.");
    } finally {
      setResetBusy(false);
    }
  }

  async function handleLogout() {
    if (
      !window.confirm(
        "Log out of Muhr? You will need to sign in again to access your account."
      )
    ) {
      return;
    }
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // e.g. missing env in dev
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-neutral-700">
            Manage your profile and account settings
          </p>
        </div>
        {profileItems.length > 0 && (
          <span className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-sm font-semibold tabular-nums text-neutral-800">
            {profilePercent}% profile complete
          </span>
        )}
      </div>

      {profileItems.length > 0 && (
        <ProfileCompletionCard percent={profilePercent} items={profileItems} />
      )}

      <div className="flex gap-1 border-b border-black/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-neutral-950"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-950" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="space-y-6">
          <ProfileOverviewSection onUpdated={() => void refreshCompletion()} />
          <PhysicalMeasurementsSection onUpdated={() => void refreshCompletion()} />
        </div>
      )}

      {activeTab === "identity" && (
        <div className="space-y-6">
          <div
            id="identity-verification"
            className="scroll-mt-24 rounded-xl border border-black/10 bg-white p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-medium text-neutral-950">Identity review</h2>
              {kycStatus !== null && <KycStatusBadge status={kycStatus} />}
            </div>
            <div className="mt-4">
              {kycStatus !== null ? (
                <ManualIdentityVerification
                  kycStatus={kycStatus}
                  onStatusChange={(status) => {
                    setKycStatus(status);
                    void refreshCompletion();
                  }}
                />
              ) : (
                <span className="inline-block h-24 w-full animate-pulse rounded-lg bg-black/5" />
              )}
            </div>
          </div>

          <div id="complete-profile" className="scroll-mt-24">
            <CompleteProfileSection onUpdated={() => void refreshCompletion()} />
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-medium text-neutral-950">Password</h2>
            <p className="mt-1 text-sm text-neutral-700">
              We will email a one-time link to set a new password.
            </p>
            <div className="mt-4">
              {resetErr && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                  {resetErr}
                </p>
              )}
              {resetMsg && (
                <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                  {resetMsg}
                </p>
              )}
              <button
                type="button"
                onClick={() => void sendPasswordReset()}
                disabled={resetBusy}
                className={ghostButtonVariants()}
              >
                {resetBusy ? "Sending…" : "Send Reset Link"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-red-900">Danger zone</h2>
                <p className="text-xs text-red-900/70">Irreversible actions</p>
              </div>
              <button
                type="button"
                className={dangerButtonVariants({ size: "sm" })}
              >
                Delete account
              </button>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className={ghostButtonVariants()}
            >
              {loggingOut ? "Signing out…" : "Log out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
