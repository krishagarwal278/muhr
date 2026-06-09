"use client";

import Image from "next/image";
import { SignedStorageImage } from "@/components/ui/SignedStorageImage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_CHARACTER_PHOTOS, MIN_CHARACTER_PHOTOS } from "@/lib/profile/completion";
import { recommendFee } from "@/lib/pricing/recommend";
import { outlineButtonVariants, solidButtonVariants } from "@/components/ui/button-recipes";

interface CharacterPhoto {
  id: string;
  file_name: string;
  signed_url: string | null;
  slot_index: number | null;
}

interface CompleteProfileSectionProps {
  onUpdated?: () => void;
}

export function CompleteProfileSection({ onUpdated }: CompleteProfileSectionProps) {
  const [photos, setPhotos] = useState<CharacterPhoto[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [photoActionId, setPhotoActionId] = useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = useState<CharacterPhoto | null>(null);
  const [savingMeasures, setSavingMeasures] = useState(false);
  const [measurementsEditing, setMeasurementsEditing] = useState(false);
  const [measurementsSaveOk, setMeasurementsSaveOk] = useState(false);
  const [measurementsSaveError, setMeasurementsSaveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState(false);

  const [savedMeasurements, setSavedMeasurements] = useState({
    height: "",
    weight: "",
    chest: "",
    waist: "",
    hips: "",
    shoeSize: "",
  });
  const [editMeasurements, setEditMeasurements] = useState({
    height: "",
    weight: "",
    chest: "",
    waist: "",
    hips: "",
    shoeSize: "",
  });
  const [savedSetup, setSavedSetup] = useState({
    minFee: "",
    consentVideo: false,
    licenseSigned: false,
  });
  const [editSetup, setEditSetup] = useState({
    minFee: "",
    consentVideo: false,
    licenseSigned: false,
  });
  const [setupEditing, setSetupEditing] = useState(false);
  const [setupSaveOk, setSetupSaveOk] = useState(false);
  const [setupSaveError, setSetupSaveError] = useState<string | null>(null);
  const [savingSetup, setSavingSetup] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slotInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const atPhotoLimit = photoCount >= MAX_CHARACTER_PHOTOS;

  const slots = Array.from({ length: MAX_CHARACTER_PHOTOS }, (_, slotIndex) =>
    photos.find((p) => p.slot_index === slotIndex) ?? null
  );

  const load = useCallback(async () => {
    const [photosRes, measuresRes] = await Promise.all([
      fetch("/api/profile/character-photos"),
      fetch("/api/profile/measurements"),
    ]);
    if (photosRes.ok) {
      const p = await photosRes.json();
      const count = p.count ?? 0;
      setPhotos(
        (p.photos ?? []).map((row: CharacterPhoto, index: number) => ({
          id: row.id,
          file_name: row.file_name,
          signed_url: row.signed_url,
          slot_index: row.slot_index ?? index,
        }))
      );
      setPhotoCount(count);
      setVerificationNotice(count >= MIN_CHARACTER_PHOTOS);
    }
    if (measuresRes.ok) {
      const mRes = await measuresRes.json();
      const m = mRes.data ?? mRes;
      const measurements = {
        height: m.height ?? "",
        weight: m.weight ?? "",
        chest: m.chest ?? "",
        waist: m.waist ?? "",
        hips: m.hips ?? "",
        shoeSize: m.shoeSize ?? "",
      };
      setSavedMeasurements(measurements);
      setEditMeasurements(measurements);
      const setup = {
        minFee: m.minLicenseFeeInr != null ? String(m.minLicenseFeeInr) : "",
        consentVideo: m.consentVideoCompleted === true,
        licenseSigned: m.platformLicenseSigned === true,
      };
      setSavedSetup(setup);
      setEditSetup(setup);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadPhotos(fileList: FileList | File[] | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/") || f.name.match(/\.(jpe?g|png|webp|heic)$/i));
    if (files.length === 0) {
      setError("Please choose image files (JPEG, PNG, or WebP).");
      return;
    }

    setUploading(true);
    setError(null);
    setOk(null);
    setUploadProgress(`Uploading ${files.length} photo${files.length !== 1 ? "s" : ""}…`);

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f, f.name));
      const res = await fetch("/api/profile/character-photos", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Upload failed");
        return;
      }
      const count = data.count ?? photoCount;
      const n = data.uploaded?.length ?? 0;
      setPhotoCount(count);
      if (count >= MIN_CHARACTER_PHOTOS) {
        setVerificationNotice(true);
        setOk(
          n > 0
            ? `${n} photo${n !== 1 ? "s" : ""} uploaded. You're ready for character sheet generation.`
            : null
        );
      } else {
        setOk(`${n} photo${n !== 1 ? "s" : ""} uploaded — add ${MIN_CHARACTER_PHOTOS - count} more.`);
      }
      if (data.failed?.length) {
        setError(`${data.failed.length} file(s) could not be uploaded. Try smaller JPEG/PNG files.`);
      }
      await load();
      onUpdated?.();
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deletePhoto(photoId: string) {
    setPhotoActionId(photoId);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/profile/character-photos/${photoId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not delete photo");
        return;
      }
      const count = data.count ?? 0;
      setPhotoCount(count);
      setVerificationNotice(count >= MIN_CHARACTER_PHOTOS);
      setOk("Photo removed");
      await load();
      onUpdated?.();
    } finally {
      setPhotoActionId(null);
    }
  }

  async function uploadToSlot(slotIndex: number, file: File) {
    setPhotoActionId(`slot-${slotIndex}`);
    setError(null);
    setOk(null);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      fd.append("slot_index", String(slotIndex));
      const res = await fetch("/api/profile/character-photos", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Upload failed");
        return;
      }
      const count = data.count ?? photoCount;
      setPhotoCount(count);
      setVerificationNotice(count >= MIN_CHARACTER_PHOTOS);
      setOk("Photo added");
      await load();
      onUpdated?.();
    } finally {
      setPhotoActionId(null);
      const input = slotInputRefs.current[slotIndex];
      if (input) input.value = "";
    }
  }

  function startMeasurementsEdit() {
    setEditMeasurements({ ...savedMeasurements });
    setMeasurementsSaveError(null);
    setMeasurementsSaveOk(false);
    setMeasurementsEditing(true);
  }

  async function saveMeasurements() {
    setSavingMeasures(true);
    setMeasurementsSaveError(null);
    setMeasurementsSaveOk(false);
    try {
      const res = await fetch("/api/profile/measurements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          height: editMeasurements.height,
          weight: editMeasurements.weight,
          chest: editMeasurements.chest,
          waist: editMeasurements.waist,
          hips: editMeasurements.hips,
          shoe_size: editMeasurements.shoeSize,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data.error?.message ?? data.error;
        setMeasurementsSaveError(typeof errorMsg === "string" ? errorMsg : "Could not save");
        return;
      }
      setSavedMeasurements({ ...editMeasurements });
      setMeasurementsEditing(false);
      setMeasurementsSaveOk(true);
      setTimeout(() => setMeasurementsSaveOk(false), 2500);
      onUpdated?.();
    } finally {
      setSavingMeasures(false);
    }
  }

  function startSetupEdit() {
    setEditSetup({ ...savedSetup });
    setSetupSaveError(null);
    setSetupSaveOk(false);
    setSetupEditing(true);
  }

  async function saveSetup() {
    setSavingSetup(true);
    setSetupSaveError(null);
    setSetupSaveOk(false);
    try {
      const fee = editSetup.minFee.trim() ? parseInt(editSetup.minFee, 10) : undefined;
      const res = await fetch("/api/profile/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(fee && fee > 0 ? { minLicenseFeeInr: fee } : {}),
          consentVideoCompleted: editSetup.consentVideo,
          platformLicenseSigned: editSetup.licenseSigned,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSetupSaveError(typeof data.error === "string" ? data.error : "Could not save");
        return;
      }
      setSavedSetup({ ...editSetup });
      setSetupEditing(false);
      setSetupSaveOk(true);
      setTimeout(() => setSetupSaveOk(false), 2500);
      onUpdated?.();
    } finally {
      setSavingSetup(false);
    }
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
          Upload {MIN_CHARACTER_PHOTOS} high-quality solo photos from different angles, similar to the example below.
          Quality matters more than quantity — sharp, well-lit shots work best.
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
            <li>High quality only — sharp focus, good lighting, plain background</li>
            <li>Solo shots from different angles: front, both profiles, and back</li>
            <li>Avoid filters or heavy editing</li>
          </ul>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Your uploaded photos
          </p>
          <div className="flex flex-wrap gap-2">
            {slots.map((photo, slotIndex) => {
              const busy = photoActionId === photo?.id || photoActionId === `slot-${slotIndex}`;
              if (!photo) {
                return (
                  <div key={`empty-${slotIndex}`} className="relative h-16 w-16 shrink-0">
                    <button
                      type="button"
                      disabled={busy || uploading}
                      onClick={() => slotInputRefs.current[slotIndex]?.click()}
                      className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white text-neutral-400 transition hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 disabled:opacity-50"
                      aria-label={`Add photo ${slotIndex + 1}`}
                    >
                      {busy ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
                      ) : (
                        <span className="text-xl leading-none">+</span>
                      )}
                    </button>
                    <input
                      ref={(el) => {
                        slotInputRefs.current[slotIndex] = el;
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic"
                      className="sr-only"
                      disabled={busy || uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadToSlot(slotIndex, file);
                      }}
                    />
                    <span className="pointer-events-none absolute bottom-0 left-0 right-0 rounded-b-lg bg-neutral-100/90 py-px text-center text-[9px] font-medium text-neutral-500">
                      {slotIndex + 1}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={photo.id}
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-100"
                  title={photo.file_name}
                >
                  <button
                    type="button"
                    disabled={busy || !photo.signed_url}
                    onClick={() => setViewPhoto(photo)}
                    className="relative h-full w-full cursor-zoom-in disabled:cursor-default"
                    aria-label={`View photo ${slotIndex + 1}`}
                  >
                    {photo.signed_url ? (
                      <SignedStorageImage
                        src={photo.signed_url}
                        alt={`Character photo ${slotIndex + 1}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">
                        No preview
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      void deletePhoto(photo.id);
                    }}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-black/55 text-white/90 transition hover:bg-red-600 disabled:opacity-50"
                    aria-label={`Delete photo ${slotIndex + 1}`}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                  {busy && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    </div>
                  )}
                  <span className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/50 py-px text-center text-[9px] font-medium text-white/90">
                    {slotIndex + 1}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Click a photo to view it. Use + on empty slots or the upload area below to add photos.
          </p>
        </div>

        {viewPhoto?.signed_url && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Photo preview"
            onClick={() => setViewPhoto(null)}
          >
            <div
              className="relative max-h-[85vh] max-w-lg overflow-hidden rounded-xl bg-neutral-950 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setViewPhoto(null)}
                className="absolute right-2 top-2 z-10 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white hover:bg-black/80"
              >
                Close
              </button>
              <div className="relative aspect-[3/4] w-[min(90vw,24rem)]">
                <SignedStorageImage
                  src={viewPhoto.signed_url}
                  alt={viewPhoto.file_name}
                  fill
                  sizes="(max-width: 768px) 90vw, 24rem"
                  className="object-contain"
                />
              </div>
              <p className="truncate px-3 py-2 text-center text-xs text-neutral-400">{viewPhoto.file_name}</p>
            </div>
          </div>
        )}

        <div
          className={`mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed py-10 transition ${
            atPhotoLimit
              ? "cursor-not-allowed border-neutral-200 bg-neutral-50/80 opacity-60"
              : dragOver
                ? "cursor-pointer border-neutral-500 bg-neutral-50"
                : "cursor-pointer border-neutral-300 bg-white hover:border-neutral-400"
          }`}
          onDragOver={(e) => {
            if (atPhotoLimit) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!uploading && !atPhotoLimit) void uploadPhotos(e.dataTransfer.files);
          }}
          onClick={() => {
            if (!atPhotoLimit) fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (!atPhotoLimit && (e.key === "Enter" || e.key === " ")) fileInputRef.current?.click();
          }}
          role="button"
          tabIndex={atPhotoLimit ? -1 : 0}
          aria-disabled={atPhotoLimit}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic"
            multiple
            className="sr-only"
            disabled={uploading || atPhotoLimit}
            onChange={(e) => void uploadPhotos(e.target.files)}
          />
          <span className="text-2xl text-neutral-400">+</span>
          <span className="mt-2 text-sm font-medium text-neutral-700">
            {uploading ? uploadProgress ?? "Uploading…" : atPhotoLimit ? "Photo limit reached" : "Choose or drop photos"}
          </span>
          <span className="mt-1 text-xs text-neutral-500">
            {photoCount >= MAX_CHARACTER_PHOTOS
              ? "Maximum reached — delete a photo above to free a slot"
              : `Select multiple files at once (${MAX_CHARACTER_PHOTOS - photoCount} slot${MAX_CHARACTER_PHOTOS - photoCount !== 1 ? "s" : ""} left)`}
          </span>
        </div>
        <p className="mt-3 text-center text-sm text-neutral-700">
          {photoCount} of {MIN_CHARACTER_PHOTOS} photos uploaded
        </p>

        {verificationNotice && (
          <div className="mt-4 rounded-lg border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
            <p className="font-medium text-neutral-950">Photos received</p>
            <p className="mt-1 text-neutral-700">
              We&apos;ll use these for your character sheet when you&apos;re ready for brand matching. Our team may
              reach out if anything needs a higher-quality retake.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-neutral-950">Physical measurements</h3>
            <p className="mt-1 text-sm text-neutral-600">Help brands find the right fit</p>
          </div>
          {!measurementsEditing && (
            <button
              type="button"
              onClick={startMeasurementsEdit}
              className={outlineButtonVariants()}
            >
              Edit
            </button>
          )}
        </div>

        {measurementsSaveError && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {measurementsSaveError}
          </p>
        )}
        {measurementsSaveOk && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Measurements saved.
          </p>
        )}

        <div className="mt-4">
          {measurementsEditing ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Height", key: "height" as const, ph: "5'10\"" },
                  { label: "Weight", key: "weight" as const, ph: "75 kgs" },
                  { label: "Chest", key: "chest" as const, ph: '38"' },
                  { label: "Waist", key: "waist" as const, ph: '32"' },
                  { label: "Hips", key: "hips" as const, ph: '36"' },
                  { label: "Shoe size", key: "shoeSize" as const, ph: "10 US" },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="mb-1 block text-xs font-medium text-neutral-700">{field.label}</label>
                    <input
                      value={editMeasurements[field.key]}
                      onChange={(e) => setEditMeasurements({ ...editMeasurements, [field.key]: e.target.value })}
                      placeholder={field.ph}
                      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void saveMeasurements()}
                  disabled={savingMeasures}
                  className={solidButtonVariants()}
                >
                  {savingMeasures ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMeasurementsEditing(false);
                    setMeasurementsSaveError(null);
                    setEditMeasurements({ ...savedMeasurements });
                  }}
                  className="text-sm font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <dl className="grid grid-cols-2 gap-4">
              <MeasurementItem label="Height" value={savedMeasurements.height || "—"} />
              <MeasurementItem label="Weight" value={savedMeasurements.weight || "—"} />
              <MeasurementItem label="Chest" value={savedMeasurements.chest || "—"} />
              <MeasurementItem label="Waist" value={savedMeasurements.waist || "—"} />
              <MeasurementItem label="Hips" value={savedMeasurements.hips || "—"} />
              <MeasurementItem label="Shoe size" value={savedMeasurements.shoeSize || "—"} />
            </dl>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 rounded-xl border border-black/10 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-neutral-950">Additional setup</h3>
            <p className="mt-1 text-sm text-neutral-600">Licensing preferences and agreements</p>
          </div>
          {!setupEditing && (
            <button
              type="button"
              onClick={startSetupEdit}
              className={outlineButtonVariants()}
            >
              Edit
            </button>
          )}
        </div>

        {setupSaveError && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {setupSaveError}
          </p>
        )}
        {setupSaveOk && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Setup saved.
          </p>
        )}

        <div className="mt-4">
          {setupEditing ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Minimum license fee (INR)</label>
                  <input
                    type="number"
                    min={1}
                    value={editSetup.minFee}
                    onChange={(e) => setEditSetup({ ...editSetup, minFee: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full max-w-xs rounded-lg border border-black/10 px-4 py-2 text-sm outline-none"
                  />
                  <MinFeeTierHint minFee={editSetup.minFee} />
                </div>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={editSetup.consentVideo}
                    onChange={(e) => setEditSetup({ ...editSetup, consentVideo: e.target.checked })}
                    className="accent-neutral-950"
                  />
                  I have recorded my consent video (or will upload soon)
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={editSetup.licenseSigned}
                    onChange={(e) => setEditSetup({ ...editSetup, licenseSigned: e.target.checked })}
                    className="accent-neutral-950"
                  />
                  I agree to the Muhr platform license terms
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void saveSetup()}
                  disabled={savingSetup}
                  className={solidButtonVariants()}
                >
                  {savingSetup ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSetupEditing(false);
                    setSetupSaveError(null);
                    setEditSetup({ ...savedSetup });
                  }}
                  className="text-sm font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <dl className="space-y-3">
              <SetupItem
                label="Minimum license fee"
                value={savedSetup.minFee ? `₹${parseInt(savedSetup.minFee, 10).toLocaleString("en-IN")}` : "—"}
              />
              <SetupItem
                label="Consent video recorded"
                value={savedSetup.consentVideo ? "Yes" : "No"}
              />
              <SetupItem
                label="Platform license terms"
                value={savedSetup.licenseSigned ? "Agreed" : "Not agreed"}
              />
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

function MeasurementItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-1 text-sm text-neutral-950">{value}</dd>
    </div>
  );
}

function SetupItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-neutral-700">{label}</dt>
      <dd className="text-sm font-medium text-neutral-950">{value}</dd>
    </div>
  );
}

function MinFeeTierHint({ minFee }: { minFee: string }) {
  const parsed = useMemo(() => {
    const n = Number.parseInt(minFee, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [minFee]);

  const recommendation = useMemo(() => {
    if (parsed == null) return null;
    return recommendFee(
      { minLicenseFeeInr: parsed },
      { durationDays: 30, channels: ["Instagram", "Facebook"], territories: ["India"] }
    );
  }, [parsed]);

  if (!parsed) {
    return (
      <p className="mt-1.5 text-xs text-neutral-500">
        Set the lowest amount you’d accept for a 30-day Instagram + Facebook campaign in India.
        We’ll use it to anchor the suggested range brands see.
      </p>
    );
  }

  if (!recommendation) return null;

  return (
    <p className="mt-1.5 text-xs text-neutral-600">
      <span className="font-medium text-neutral-900">{recommendation.tier.label}</span> ·{" "}
      {recommendation.tier.followerBand}. 30-day Insta + FB campaign in
      India will roughly see{" "}
      <span className="font-medium tabular-nums text-neutral-900">
        ₹{recommendation.lowInr.toLocaleString("en-IN")} – ₹
        {recommendation.highInr.toLocaleString("en-IN")}
      </span>{" "}
      between (mid ₹{recommendation.midInr.toLocaleString("en-IN")}). Estimate only.
    </p>
  );
}
