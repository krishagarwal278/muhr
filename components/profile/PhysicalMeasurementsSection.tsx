"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { Alert } from "@/components/ui/alert";
import { outlineButtonVariants, solidButtonVariants } from "@/components/ui/button-recipes";

interface Measurements {
  height: string;
  weight: string;
  chest: string;
  waist: string;
  hips: string;
  shoeSize: string;
}

const INITIAL_MEASUREMENTS: Measurements = {
  height: "",
  weight: "",
  chest: "",
  waist: "",
  hips: "",
  shoeSize: "",
};

interface PhysicalMeasurementsSectionProps {
  onUpdated?: () => void;
}

export function PhysicalMeasurementsSection({ onUpdated }: PhysicalMeasurementsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Measurements>(INITIAL_MEASUREMENTS);
  const [edit, setEdit] = useState<Measurements>(INITIAL_MEASUREMENTS);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/measurements");
      if (res.ok) {
        const json = await res.json();
        const m = json.data ?? json;
        const measurements: Measurements = {
          height: m.height ?? "",
          weight: m.weight ?? "",
          chest: m.chest ?? "",
          waist: m.waist ?? "",
          hips: m.hips ?? "",
          shoeSize: m.shoeSize ?? "",
        };
        setSaved(measurements);
        setEdit(measurements);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEditing() {
    setEdit({ ...saved });
    setSaveError(null);
    setSaveOk(false);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const res = await fetch("/api/profile/measurements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          height: edit.height,
          weight: edit.weight,
          chest: edit.chest,
          waist: edit.waist,
          hips: edit.hips,
          shoe_size: edit.shoeSize,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data.error?.message ?? data.error;
        setSaveError(typeof errorMsg === "string" ? errorMsg : "Could not save");
        return;
      }
      setSaved({ ...edit });
      setEditing(false);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    setEditing(false);
    setSaveError(null);
    setEdit({ ...saved });
  }

  const fields = [
    { label: "Height", key: "height" as const, placeholder: "5'10\"" },
    { label: "Weight", key: "weight" as const, placeholder: "75 kgs" },
    { label: "Chest", key: "chest" as const, placeholder: '38"' },
    { label: "Waist", key: "waist" as const, placeholder: '32"' },
    { label: "Hips", key: "hips" as const, placeholder: '36"' },
    { label: "Shoe size", key: "shoeSize" as const, placeholder: "10 US" },
  ];

  return (
    <SectionCard
      title="Physical measurements"
      description="Help brands find the right fit"
      headerAction={
        !loading && !editing ? (
          <button type="button" onClick={startEditing} className={outlineButtonVariants()}>
            Edit
          </button>
        ) : null
      }
    >
      {saveError && <Alert variant="error" className="mb-4">{saveError}</Alert>}
      {saveOk && <Alert variant="success" className="mb-4">Measurements saved.</Alert>}

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 animate-pulse rounded bg-black/5" />
              <div className="h-5 w-20 animate-pulse rounded bg-black/5" />
            </div>
          ))}
        </div>
      ) : editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {fields.map((field) => (
              <div key={field.label}>
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  {field.label}
                </label>
                <input
                  value={edit[field.key]}
                  onChange={(e) => setEdit({ ...edit, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className={solidButtonVariants()}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              className="text-sm font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {field.label}
              </dt>
              <dd className="mt-1 text-sm text-neutral-950">
                {saved[field.key] || "—"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </SectionCard>
  );
}
