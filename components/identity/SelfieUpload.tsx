"use client";

import type { IdentityVerificationFileKind } from "@/types";

const SELFIE_SLOTS: { kind: IdentityVerificationFileKind; label: string; hint: string }[] = [
  { kind: "liveness_front", label: "Front", hint: "Face the camera straight on" },
  { kind: "liveness_left", label: "Left", hint: "Turn your head slightly left" },
  { kind: "liveness_right", label: "Right", hint: "Turn your head slightly right" },
];

interface SelfieUploadProps {
  files: Partial<Record<IdentityVerificationFileKind, File>>;
  onFileChange: (kind: IdentityVerificationFileKind, file: File | null) => void;
}

export function SelfieUpload({ files, onFileChange }: SelfieUploadProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Upload three recent selfies (front, left, right) in good lighting with a plain background. Use your
        phone camera if you prefer.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {SELFIE_SLOTS.map((slot) => (
          <label
            key={slot.kind}
            className={`flex cursor-pointer flex-col overflow-hidden rounded-xl border transition hover:border-neutral-400 ${
              files[slot.kind] ? "border-emerald-300 bg-emerald-50/50" : "border-dashed border-neutral-300 bg-neutral-50"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              onChange={(e) => onFileChange(slot.kind, e.target.files?.[0] ?? null)}
            />
            <div className="flex aspect-square flex-col items-center justify-center px-3 py-8 text-center">
              {files[slot.kind] ? (
                <>
                  <span className="text-lg text-emerald-600">✓</span>
                  <span className="mt-2 text-xs font-medium text-emerald-900">{slot.label} added</span>
                </>
              ) : (
                <>
                  <span className="text-2xl text-neutral-300">+</span>
                  <span className="mt-2 text-xs font-medium text-neutral-800">{slot.label}</span>
                </>
              )}
            </div>
            <div className="border-t border-black/5 px-2 py-2">
              <p className="text-[10px] leading-snug text-neutral-600">{slot.hint}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
