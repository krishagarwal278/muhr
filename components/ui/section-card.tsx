"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { outlineButtonVariants, solidButtonVariants } from "./button-recipes";
import { surfaceCardVariants } from "./surface-card";
import { Alert } from "./alert";

export interface SectionCardProps {
  title: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  id?: string;
}

export function SectionCard({
  title,
  description,
  required,
  children,
  className,
  headerAction,
  id,
}: SectionCardProps) {
  return (
    <div id={id} className={cx(surfaceCardVariants(), className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-neutral-950">
            {title}
            {required ? <span className="ml-0.5 text-red-600">*</span> : null}
          </h3>
          {description ? <p className="mt-1 text-sm text-neutral-600">{description}</p> : null}
        </div>
        {headerAction}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export interface EditableSectionProps {
  title: string;
  description?: string;
  className?: string;
  saving?: boolean;
  error?: string | null;
  success?: string | null;
  onSave: () => void | Promise<void>;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  children: (editing: boolean) => React.ReactNode;
}

export function EditableSection({
  title,
  description,
  className,
  saving = false,
  error,
  success,
  onSave,
  onCancel,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  children,
}: EditableSectionProps) {
  const [editing, setEditing] = useState(false);

  function handleEdit() {
    setEditing(true);
  }

  async function handleSave() {
    await onSave();
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
    onCancel?.();
  }

  return (
    <div className={cx(surfaceCardVariants(), className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-neutral-950">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-neutral-600">{description}</p>
          )}
        </div>
        {!editing && (
          <button type="button" onClick={handleEdit} className={outlineButtonVariants()}>
            Edit
          </button>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mt-3">
          {success}
        </Alert>
      )}

      <div className="mt-4">
        {children(editing)}
      </div>

      {editing && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={solidButtonVariants()}
          >
            {saving ? "Saving…" : saveLabel}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            {cancelLabel}
          </button>
        </div>
      )}
    </div>
  );
}
