"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { MAX_CHARACTER_PHOTOS, MIN_CHARACTER_PHOTOS } from "@/lib/profile/completion";

interface CompleteProfileSectionProps {
  onUpdated?: () => void;
}

export function CompleteProfileSection({ onUpdated }: CompleteProfileSectionProps) {
  const [photoCount, setPhotoCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [savingMeasures, setSavingMeasures] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState(false);

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [minFee, setMinFee] = useState("");
  const [consentVideo, setConsentVideo] = useState(false);
  const [licenseSigned, setLicenseSigned] = useState(false);

  const load = useCallback(async () => {
    const [photosRes, measuresRes] = await Promise.all([
      fetch("/api/profile/character-photos"),
      fetch("/api/profile/measurements"),
    ]);
    if (photosRes.ok) {
      const p = await photosRes.json();
      const count = p.count ?? 0;
      setPhotoCount(count);
      setVerificationNotice(count >= MIN_CHARACTER_PHOTOS);
    }
    if (measuresRes.ok) {
      const m = await measuresRes.json();
      setHeight(m.height ?? "");
      setWeight(m.weight ?? "");
      setChest(m.chest ?? "");
      setWaist(m.waist ?? "");
      setHips(m.hips ?? "");
      setShoeSize(m.shoeSize ?? "");
      setMinFee(m.minLicenseFeeInr != null ? String(m.minLicenseFeeInr) : "");
      setConsentVideo(m.consentVideoCompleted === true);
      setLicenseSigned(m.platformLicenseSigned === true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    setOk(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/profile/character-photos", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Upload failed");
        return;
      }
      const count = data.count ?? photoCount;
      setPhotoCount(count);
      if (count >= MIN_CHARACTER_PHOTOS) {
        setVerificationNotice(true);
        setOk(null);
      } else {
        setOk(`${data.uploaded?.length ?? 0} photo(s) uploaded — add ${MIN_CHARACTER_PHOTOS - count} more to submit for review.`);
      }
      onUpdated?.();
    } finally {
      setUploading(false);
    }
  }

  async function saveMeasurements(e: React.FormEvent) {
    e.preventDefault();
    setSavingMeasures(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/measurements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ height, weight, chest, waist, hips, shoe_size: shoeSize }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Could not save");
        return;
      }
      setOk("Measurements saved");
      onUpdated?.();
    } finally {
      setSavingMeasures(false);
    }
  }

  async function saveOnboardingFlags() {
    const fee = minFee.trim() ? parseInt(minFee, 10) : undefined;
    await fetch("/api/profile/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(fee && fee > 0 ? { minLicenseFeeInr: fee } : {}),
        consentVideoCompleted: consentVideo,
        platformLicenseSigned: licenseSigned,
      }),
    });
    onUpdated?.();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {error && (
        <p className="lg:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
      {ok && (
        <p className="lg:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {ok}
        </p>
      )}

      <div className="rounded-xl border border-black/10 bg-neutral-50/50 p-5 lg:col-span-2">
        <h3 className="font-semibold text-neutral-950">Upload character photos</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Upload {MIN_CHARACTER_PHOTOS}–{MAX_CHARACTER_PHOTOS} solo photos from different angles, similar to the example
          below.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-white p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Example character sheet</p>
          <Image
            src="/character-sheet-demo.png"
            alt="Example character sheet showing front, side, and back angles"
            width={900}
            height={500}
            className="w-full rounded-lg object-contain"
            priority
          />
        </div>

        <div className="mt-4 rounded-lg border border-sky-200/80 bg-sky-50/80 p-3 text-xs text-sky-950">
          <p className="font-medium">Tips</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sky-900/90">
            <li>Solo shots only, good lighting, plain background</li>
            <li>Include front, both profiles, and back (close-up and waist-up if possible)</li>
            <li>High resolution (min 1080p)</li>
          </ul>
        </div>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white py-10 hover:border-neutral-400">
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => void uploadPhotos(e.target.files)}
          />
          <span className="text-2xl text-neutral-400">+</span>
          <span className="mt-2 text-sm text-neutral-600">
            {uploading ? "Uploading…" : "Choose photos"}
          </span>
        </label>
        <p className="mt-3 text-center text-sm text-neutral-700">
          {photoCount} of {MIN_CHARACTER_PHOTOS}–{MAX_CHARACTER_PHOTOS} photos uploaded
        </p>

        {verificationNotice && (
          <div className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Photos received</p>
            <p className="mt-1 text-amber-900/90">
              Verification typically takes up to <strong>24 hours</strong>. If approved, we will process your character
              sheet for brand matching and licensing.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={(e) => void saveMeasurements(e)} className="rounded-xl border border-black/10 bg-neutral-50/50 p-5">
        <h3 className="font-semibold text-neutral-950">Physical measurements</h3>
        <p className="mt-1 text-sm text-neutral-600">Help brands find the right fit</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: "Height", value: height, set: setHeight, ph: "5'10\"" },
            { label: "Weight", value: weight, set: setWeight, ph: "165 lbs" },
            { label: "Chest", value: chest, set: setChest, ph: '38"' },
            { label: "Waist", value: waist, set: setWaist, ph: '32"' },
            { label: "Hips", value: hips, set: setHips, ph: '36"' },
            { label: "Shoe size", value: shoeSize, set: setShoeSize, ph: "10 US" },
          ].map((field) => (
            <div key={field.label}>
              <label className="mb-1 block text-xs font-medium text-neutral-700">{field.label}</label>
              <input
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                placeholder={field.ph}
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          disabled={savingMeasures}
          className="mt-4 w-full rounded-lg bg-neutral-950 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {savingMeasures ? "Saving…" : "Save measurements"}
        </button>
      </form>

      <div className="lg:col-span-2 rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-medium text-neutral-950">Additional setup</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Minimum license fee (INR)</label>
            <input
              type="number"
              min={1}
              value={minFee}
              onChange={(e) => setMinFee(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full max-w-xs rounded-lg border border-black/10 px-4 py-2 text-sm outline-none"
            />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={consentVideo}
              onChange={(e) => setConsentVideo(e.target.checked)}
              className="accent-neutral-950"
            />
            I have recorded my consent video (or will upload soon)
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={licenseSigned}
              onChange={(e) => setLicenseSigned(e.target.checked)}
              className="accent-neutral-950"
            />
            I agree to the Muhr platform license terms
          </label>
          <button
            type="button"
            onClick={() => void saveOnboardingFlags()}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Save additional setup
          </button>
        </div>
      </div>
    </div>
  );
}
