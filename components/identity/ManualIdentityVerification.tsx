"use client";

import { useEffect, useState } from "react";
import { KycStatusBadge } from "@/components/KycStatusBadge";
import { SelfieUpload } from "@/components/identity/SelfieUpload";
import {
  SOCIAL_SCREENSHOT_SLOTS,
  SocialScreenshotUpload,
} from "@/components/identity/SocialScreenshotUpload";
import type { IdentityVerificationFileKind, KycStatus } from "@/types";

const LIVENESS_KINDS: IdentityVerificationFileKind[] = [
  "liveness_front",
  "liveness_left",
  "liveness_right",
];

type WizardStep = 1 | 2 | 3;

interface ManualIdentityVerificationProps {
  kycStatus: KycStatus;
  onStatusChange: (status: KycStatus) => void;
}

export function ManualIdentityVerification({
  kycStatus,
  onStatusChange,
}: ManualIdentityVerificationProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [socialPlatform, setSocialPlatform] = useState("instagram");
  const [socialUsername, setSocialUsername] = useState("");

  const [files, setFiles] = useState<Partial<Record<IdentityVerificationFileKind, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<IdentityVerificationFileKind, string>>>({});

  function setFileForKind(kind: IdentityVerificationFileKind, file: File | null) {
    setFiles((prev) => {
      const next = { ...prev };
      if (file) next[kind] = file;
      else delete next[kind];
      return next;
    });
    setPreviews((prev) => {
      if (prev[kind]) URL.revokeObjectURL(prev[kind]!);
      const next = { ...prev };
      if (file) next[kind] = URL.createObjectURL(file);
      else delete next[kind];
      return next;
    });
  }

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("phone", phone.trim());
      fd.append("address", address.trim());
      fd.append("social_platform", socialPlatform);
      fd.append("social_username", socialUsername.trim());

      const requiredKinds: IdentityVerificationFileKind[] = [
        ...SOCIAL_SCREENSHOT_SLOTS.map((s) => s.kind),
        ...LIVENESS_KINDS,
      ];
      for (const kind of requiredKinds) {
        const f = files[kind];
        if (!f) {
          setError("Please upload all Instagram screenshots and selfies before submitting.");
          setSubmitting(false);
          return;
        }
        fd.append(kind, f);
      }

      const res = await fetch("/api/identity/submit", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Submission failed");
        return;
      }
      onStatusChange("pending");
      setSuccessMsg(
        typeof data.message === "string"
          ? data.message
          : "Your profile is being verified. We'll email you within 24 hours."
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
        Your identity is verified. You can upload vault assets.
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
        <h3 className="text-lg font-medium text-amber-950">Your profile is being verified</h3>
        <p className="mt-2 max-w-sm text-sm text-amber-900/80">
          {successMsg ?? "We'll email you within 24 hours once our team reviews your submission."}
        </p>
        <KycStatusBadge status="pending" className="mt-4" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              step === n ? "bg-neutral-950 text-white" : step > n ? "bg-neutral-200 text-neutral-700" : "bg-black/5 text-neutral-500"
            }`}
          >
            {n}
          </span>
        ))}
        <span className="ml-1">
          {step === 1 && "Personal details"}
          {step === 2 && "Social verification"}
          {step === 3 && "Selfie photos"}
        </span>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="First Last"
              className="w-full rounded-lg border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-black/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Phone number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full rounded-lg border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-black/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, City, State, Postal"
              className="w-full rounded-lg border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-black/20"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-lg bg-neutral-950 py-2.5 text-sm font-medium text-white hover:bg-neutral-900"
            onClick={() => {
              if (!fullName.trim() || !phone.trim() || !address.trim()) {
                setError("Please fill in all fields.");
                return;
              }
              setError(null);
              setStep(2);
            }}
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">We use this to match you with relevant brands.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Platform</label>
              <select
                value={socialPlatform}
                onChange={(e) => setSocialPlatform(e.target.value)}
                className="w-full rounded-lg border border-black/10 px-4 py-2.5 text-sm outline-none"
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Username</label>
              <input
                value={socialUsername}
                onChange={(e) => setSocialUsername(e.target.value)}
                placeholder="@yourhandle"
                className="w-full rounded-lg border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-black/20"
              />
            </div>
          </div>

          <SocialScreenshotUpload
            platform={socialPlatform}
            files={files}
            previews={previews}
            onFileChange={setFileForKind}
          />

          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-black/10 px-4 py-2 text-sm" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg bg-neutral-950 py-2.5 text-sm font-medium text-white"
              onClick={() => {
                if (!socialUsername.trim()) {
                  setError("Enter your social username.");
                  return;
                }
                if (!SOCIAL_SCREENSHOT_SLOTS.every((s) => files[s.kind])) {
                  setError("Upload all three profile screenshots.");
                  return;
                }
                setError(null);
                setStep(3);
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <SelfieUpload files={files} onFileChange={setFileForKind} />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-black/10 px-4 py-2 text-sm"
              onClick={() => setStep(2)}
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting || !LIVENESS_KINDS.every((k) => files[k])}
              className="flex-1 rounded-lg bg-neutral-950 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Submitting..." : "Submit for review"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
