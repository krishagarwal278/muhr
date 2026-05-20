"use client";

import Image from "next/image";
import type { IdentityVerificationFileKind } from "@/types";

export const SOCIAL_SCREENSHOT_SLOTS: {
  kind: IdentityVerificationFileKind;
  label: string;
  description: string;
}[] = [
  {
    kind: "social_followers",
    label: "Follower count",
    description: "Profile or Insights screen showing total followers",
  },
  {
    kind: "social_age",
    label: "Audience age",
    description: "Instagram Insights → Audience age breakdown",
  },
  {
    kind: "social_location",
    label: "Top locations",
    description: "Instagram Insights → Top cities or countries",
  },
];

interface SocialScreenshotUploadProps {
  platform: string;
  files: Partial<Record<IdentityVerificationFileKind, File>>;
  previews: Partial<Record<IdentityVerificationFileKind, string>>;
  onFileChange: (kind: IdentityVerificationFileKind, file: File | null) => void;
}

export function SocialScreenshotUpload({
  platform,
  files,
  previews,
  onFileChange,
}: SocialScreenshotUploadProps) {
  const platformLabel = platform === "tiktok" ? "TikTok" : platform === "youtube" ? "YouTube" : "Instagram";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-sky-200/80 bg-sky-50/80 p-3 text-sm text-sky-950">
        <p className="font-medium">Upload real screenshots — not typed numbers</p>
        <p className="mt-1 text-sky-900/90">
          Please upload screenshots directly from your official{" "}
          {platformLabel} profile or Insights so our team can review authentic data.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {SOCIAL_SCREENSHOT_SLOTS.map((slot) => {
          const preview = previews[slot.kind];
          const hasFile = !!files[slot.kind];
          return (
            <label
              key={slot.kind}
              className={`flex cursor-pointer flex-col overflow-hidden rounded-xl border transition hover:border-neutral-400 ${
                hasFile ? "border-emerald-300 bg-emerald-50/50" : "border-dashed border-neutral-300 bg-neutral-50"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onFileChange(slot.kind, e.target.files?.[0] ?? null)}
              />
              <div className="relative aspect-[4/3] w-full bg-white">
                {preview ? (
                  <Image src={preview} alt={slot.label} fill className="object-cover object-top" unoptimized />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-2 text-center">
                    <span className="text-2xl text-neutral-300">+</span>
                    <span className="mt-1 text-xs font-medium text-neutral-700">{slot.label}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-black/5 px-2 py-2">
                <p className="text-xs font-medium text-neutral-800">{slot.label}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-neutral-600">{slot.description}</p>
                <p className="mt-1 text-[10px] font-medium text-neutral-500">
                  {hasFile ? "✓ Screenshot added" : "Tap to upload"}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
