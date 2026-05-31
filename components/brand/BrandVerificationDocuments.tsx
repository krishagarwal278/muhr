"use client";

import { useRef, useState } from "react";
import {
  BRAND_VERIFICATION_ACCEPT,
  BRAND_VERIFICATION_DOCUMENT_TYPES,
  brandVerificationTypeLabel,
  documentsForType,
  type BrandVerificationDocument,
  type BrandVerificationDocumentType,
} from "@/lib/brand/profile";
import { apiErrorMessage, dataFromApiJson } from "@/lib/api/response";
import { Alert } from "@/components/ui/alert";
import { Icon } from "@/components/ui/icon";
import { LoadingSpinner } from "@/components/ui/loading";
import { cx } from "@/lib/cx";
import { outlineButtonVariants } from "@/components/ui/button-recipes";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BrandVerificationDocuments({
  documents,
  onChange,
  disabled = false,
}: {
  documents: BrandVerificationDocument[];
  onChange: (documents: BrandVerificationDocument[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeType, setActiveType] = useState<BrandVerificationDocumentType>("mca_registration");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | File[]) {
    setError(null);
    setUploading(true);
    const uploaded: BrandVerificationDocument[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.set("documentType", activeType);
        formData.set("file", file);

        const res = await fetch("/api/brand/profile/documents", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(apiErrorMessage(json, `Could not upload ${file.name}`));
        }

        const doc = dataFromApiJson<{ document: BrandVerificationDocument }>(json)?.document;
        if (!doc) throw new Error(`Could not upload ${file.name}`);
        uploaded.push(doc);
      }

      onChange([...uploaded, ...documents]);
    } catch (e) {
      setError((e as Error).message);
      if (uploaded.length > 0) onChange([...uploaded, ...documents]);
    } finally {
      setUploading(false);
    }
  }

  async function remove(document: BrandVerificationDocument) {
    setError(null);
    setUploading(true);
    try {
      const res = await fetch(`/api/brand/profile/documents/${document.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(apiErrorMessage(json, "Could not remove file"));
      }
      onChange(documents.filter((doc) => doc.id !== document.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="space-y-4" aria-label="Verification documents">
      <fieldset className="space-y-3">
        <legend className="sr-only">Document type</legend>
        <p className="flex flex-wrap gap-2" role="tablist" aria-label="Document type">
          {BRAND_VERIFICATION_DOCUMENT_TYPES.map((slot) => {
            const selected = activeType === slot.type;
            const hasFiles = documentsForType(documents, slot.type).length > 0;
            return (
              <button
                key={slot.type}
                type="button"
                role="tab"
                aria-selected={selected}
                disabled={disabled || uploading}
                onClick={() => setActiveType(slot.type)}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  selected
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300",
                  hasFiles && !selected ? "border-emerald-300 text-emerald-900" : null
                )}
              >
                {slot.label}
                {hasFiles ? <Icon name="check" size="xs" aria-hidden className={selected ? "text-white" : "text-emerald-700"} /> : null}
              </button>
            );
          })}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={BRAND_VERIFICATION_ACCEPT}
          multiple
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) void upload(files);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[7rem] w-full flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50/70 px-4 py-6 text-center transition hover:border-neutral-400 hover:bg-neutral-50"
        >
          {uploading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <Icon name="upload" size="md" className="text-neutral-400" aria-hidden />
              <span className="mt-2 text-sm font-medium text-neutral-900">
                Upload for {brandVerificationTypeLabel(activeType)}
              </span>
              <span className="mt-1 text-xs text-neutral-500">PDF, PNG, or JPEG · 10MB · multiple files OK</span>
            </>
          )}
        </button>
      </fieldset>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {documents.length > 0 ? (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200/90 bg-neutral-50/80 px-3 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium text-neutral-950">
                  <Icon name="file-text" size="sm" className="shrink-0 text-neutral-500" aria-hidden />
                  <span className="truncate">{doc.fileName}</span>
                </span>
                <span className="mt-0.5 block pl-6 text-xs text-neutral-500">
                  {brandVerificationTypeLabel(doc.documentType)} · {formatFileSize(doc.fileSize)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {doc.downloadUrl ? (
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={outlineButtonVariants({ size: "sm" })}
                  >
                    View
                  </a>
                ) : null}
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => void remove(doc)}
                  className="text-xs font-medium text-red-700 hover:underline"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
