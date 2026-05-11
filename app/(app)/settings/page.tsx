"use client";

import { useState, useEffect } from "react";
import { KycStatusBadge } from "@/components/KycStatusBadge";
import type { KycStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { buildPasswordResetRedirectTo } from "@/lib/auth/passwordResetRedirect";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [acceptingRequests, setAcceptingRequests] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [idRes, profileRes] = await Promise.all([
          fetch("/api/identity"),
          fetch("/api/profile"),
        ]);
        const idData = idRes.ok ? await idRes.json() : {};
        if (!cancelled) {
          setKycStatus((idData.kycStatus as KycStatus) ?? "unverified");
        }
        if (profileRes.ok) {
          const p = await profileRes.json();
          if (!cancelled) {
            setHandle(typeof p.handle === "string" ? p.handle : "");
            setName(typeof p.displayName === "string" ? p.displayName : "");
            setEmail(typeof p.email === "string" ? p.email : "");
            setAcceptingRequests(p.acceptingRequests !== false);
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

  async function handleSave() {
    setSaveError(null);
    setSaveOk(false);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: handle.trim() || null,
          displayName: name.trim(),
          acceptingRequests,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data.error === "string" ? data.error : "Could not save");
        return;
      }
      if (typeof data.handle === "string") setHandle(data.handle);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }
  async function startVerification() {
    setVerifying(true);
    try {
      const templateId = process.env.NEXT_PUBLIC_PERSONA_TEMPLATE_ID;
      const environmentId = process.env.NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID;
      if (!templateId || !environmentId) {
        setSaveError(
          "Persona env vars missing (NEXT_PUBLIC_PERSONA_TEMPLATE_ID / NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID)."
        );
        setVerifying(false);
        return;
      }

      // Ask your server for the user's reference id (don't trust the client to set it).
      const res = await fetch("/api/identity/inquiry", { method: "POST" });
      if (!res.ok) throw new Error("Could not start verification");
      const { referenceId, inquiryId } = await res.json();

      const Persona = (await import("persona")).default;
      const client = new Persona.Client({
        templateId,
        environmentId,
        referenceId,                   // links inquiry → your user
        inquiryId: inquiryId ?? undefined, // optional: resume an existing inquiry
        onReady: () => {
          setVerifying(false);
          client.open();
        },
        onComplete: ({ inquiryId, status }) => {
          // Optimistic UI; the webhook is the source of truth.
          if (status === "completed") setKycStatus("pending"); // pending review
          if (inquiryId) {
            // Local dev often doesn't receive webhooks; refresh from Persona API.
            void fetch("/api/identity/refresh", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ inquiryId }),
            })
              .then(async (r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (data?.kycStatus) setKycStatus(data.kycStatus as KycStatus);
              })
              .catch(() => {});
          }
        },
        onCancel: () => setVerifying(false),
        onError: (err) => {
          console.error(err);
          setVerifying(false);
        },
      });
    } catch (e) {
      console.error(e);
      setVerifying(false);
    }
  }

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
        setResetErr("Could not load your account email. Sign out and use “Forgot password?” on the login page.");
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-neutral-700">
          Manage your account and preferences
        </p>
      </div>

      {/* Identity verification — status from profiles.kyc_status; update via IdV webhook / admin */}
      <div
        id="identity-verification"
        className="scroll-mt-24 rounded-xl border border-black/10 bg-white p-4 sm:p-6"
      >
        <h2 className="text-lg font-medium text-neutral-950">Identity verification</h2>
        <p className="mt-1 text-sm text-neutral-700">
          Liveness and document checks must pass before you can add vault assets.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {kycStatus !== null ? (
            <KycStatusBadge status={kycStatus} />
          ) : (
            <span className="inline-block h-7 w-32 animate-pulse rounded-full bg-black/10" />
          )}
          {kycStatus !== "verified" && (
            <button
              type="button"
              className="w-full rounded-lg border border-black/10 bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:opacity-60 sm:w-auto"
              onClick={startVerification}
              disabled={verifying || kycStatus === "pending"}
              title="Start verification"
            >
              {verifying ? "Opening…" : kycStatus === "pending" ? "Review in progress" : "Start verification"}

            </button>
          )}
        </div>
      </div>

      {/* Profile */}
      <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-medium text-neutral-950">Profile</h2>
        <p className="mt-1 text-sm text-neutral-700">
          Your handle powers your public URL:{" "}
          <span className="font-mono font-medium text-neutral-900">/k/your_handle</span>
        </p>
        {saveError && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {saveError}
          </p>
        )}
        {saveOk && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Profile saved.
          </p>
        )}
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">Instagram handle</label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 font-mono text-base text-neutral-950 outline-none focus:border-black/15 sm:text-sm"
              placeholder="e.g. priya_sharma"
              maxLength={30}
            />
            <p className="mt-1 text-xs text-neutral-600">3–30 chars: lowercase letters, numbers, underscores</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">Display name (public)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-base text-neutral-950 outline-none focus:border-black/15 sm:text-sm"
              placeholder="Your name"
              maxLength={120}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-base text-neutral-950 outline-none sm:text-sm"
              placeholder="Managed via your login provider"
              disabled
            />
            <p className="mt-1 text-xs text-neutral-600">Email changes are not wired here yet.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={acceptingRequests}
              onChange={(e) => setAcceptingRequests(e.target.checked)}
              className="accent-neutral-950"
            />
            <span>
              <span className="block text-sm font-medium text-neutral-950">Accept license requests</span>
              <span className="text-xs text-neutral-600">Turn off to show brands you are not taking new requests</span>
            </span>
          </label>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-medium text-neutral-950">Notifications</h2>
        <div className="mt-4 space-y-4">
          {[
            { label: "License requests", description: "When someone wants to license your likeness" },
            { label: "Enforcement updates", description: "Status changes on your cases" },
            { label: "New detections", description: "When we find potential misuse" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-neutral-950">{item.label}</p>
                <p className="text-sm text-neutral-700">{item.description}</p>
              </div>
              <button className="relative h-6 w-11 rounded-full bg-emerald-500 transition">
                <span className="absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-white transition" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-medium text-neutral-950">Security</h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-neutral-950">Password</p>
            <p className="mt-1 text-sm text-neutral-700">
              We will email a one-time link to set a new password (configure outbound mail or Resend SMTP under
              Supabase Authentication).
            </p>
            {resetErr && (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                {resetErr}
              </p>
            )}
            {resetMsg && (
              <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                {resetMsg}
              </p>
            )}
            <button
              type="button"
              onClick={() => void sendPasswordReset()}
              disabled={resetBusy}
              className="mt-3 rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-50 disabled:opacity-60"
            >
              {resetBusy ? "Sending…" : "Email me a reset link"}
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:p-6">
        <h2 className="text-lg font-medium text-red-900">Danger zone</h2>
        <p className="mt-1 text-sm text-red-900/75">
          Irreversible and destructive actions
        </p>
        <div className="mt-4">
          <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100">
            Delete account
          </button>
        </div>
      </div>

      {/* Save button */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-neutral-950 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-900 disabled:opacity-60 sm:w-auto"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
