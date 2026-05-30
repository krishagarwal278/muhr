"use client";

import { useRef, useState } from "react";
import { SignedStorageImage } from "@/components/ui/SignedStorageImage";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { LoadingSpinner } from "@/components/ui/loading";
import { apiErrorMessage, dataFromApiJson } from "@/lib/api/response";
import { cx } from "@/lib/cx";

export const PROFILE_AVATAR_UPDATED_EVENT = "profile-avatar-updated";

function broadcastAvatar(url: string | null) {
  window.dispatchEvent(
    new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, { detail: { avatarUrl: url } })
  );
}

const sizeClasses = {
  sm: "h-9 w-9 text-sm",
  md: "h-16 w-16 text-lg",
  lg: "h-24 w-24 text-2xl",
} as const;

export function ProfileAvatar({
  name,
  avatarUrl = null,
  size = "md",
  editable = false,
  layout = "stacked",
  className,
  onAvatarChange,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof sizeClasses;
  editable?: boolean;
  /** Inline places the upload hint beside the photo (profile overview). */
  layout?: "stacked" | "inline";
  className?: string;
  onAvatarChange?: (avatarUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const initial = (name.trim().charAt(0) || "U").toUpperCase();
  const dim = size === "sm" ? 36 : size === "md" ? 64 : 96;
  const hasPhoto = Boolean(avatarUrl);

  function applyAvatar(url: string | null) {
    onAvatarChange?.(url);
    broadcastAvatar(url);
  }

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiErrorMessage(json, "Upload failed"));
        return;
      }
      applyAvatar(dataFromApiJson<{ avatarUrl?: string | null }>(json)?.avatarUrl ?? null);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiErrorMessage(json, "Could not remove photo"));
        return;
      }
      applyAvatar(null);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  function onIconClick() {
    if (busy || !editable) return;
    if (hasPhoto) {
      setConfirmRemoveOpen(true);
      return;
    }
    inputRef.current?.click();
  }

  const circle = (
    <span
      className={cx(
        "relative block shrink-0 overflow-hidden rounded-full",
        sizeClasses[size],
        busy && "opacity-60",
      )}
    >
      {avatarUrl ? (
        <SignedStorageImage
          src={avatarUrl}
          alt=""
          width={dim}
          height={dim}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 font-semibold text-white"
          aria-hidden
        >
          {initial}
        </span>
      )}
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </span>
      ) : null}
    </span>
  );

  if (!editable) {
    return <div className={className}>{circle}</div>;
  }

  const photoHint = `Click the photo to ${hasPhoto ? "remove" : "upload"}. JPEG, PNG, or WebP · max 5MB`;

  return (
    <>
      <FormField
        label="Profile photo"
        description={layout === "stacked" ? photoHint : undefined}
        error={error ?? undefined}
        className={className}
      >
        {layout === "inline" ? (
          <div className="flex items-start gap-4">
            <button
              type="button"
              disabled={busy}
              onClick={onIconClick}
              aria-label={hasPhoto ? "Remove profile photo" : "Upload profile photo"}
              className="shrink-0 rounded-full disabled:cursor-not-allowed"
            >
              {circle}
            </button>
            <p className="min-w-0 flex-1 pt-2 text-xs text-neutral-600">{photoHint}</p>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onIconClick}
            aria-label={hasPhoto ? "Remove profile photo" : "Upload profile photo"}
            className="shrink-0 rounded-full disabled:cursor-not-allowed"
          >
            {circle}
          </button>
        )}
      </FormField>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      <ConfirmDialog
        open={confirmRemoveOpen}
        onClose={() => setConfirmRemoveOpen(false)}
        title="Remove profile photo?"
        description="Your profile will show your initial instead."
        confirmLabel="Remove"
        onConfirm={() => {
          setConfirmRemoveOpen(false);
          void remove();
        }}
        pending={busy}
        destructive
      />
    </>
  );
}
