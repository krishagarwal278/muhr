"use client";

import { useEffect, useState } from "react";
import { BrandProfileForm } from "./BrandProfileForm";

type ApiResp<T> = { ok: boolean; data?: T; error?: { code: string; message: string } };

export default function BrandProfilePageClient() {
  const [initial, setInitial] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/brand/profile');
        const json: ApiResp<Record<string, unknown>> = await res.json();
        if (!cancelled && json.ok) setInitial((json.data as Record<string, unknown>) ?? {});
      } catch (e) {
        // log and ignore
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(values: Record<string, unknown>) {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch('/api/brand/profile', { method: 'PATCH', body: JSON.stringify(values), headers: { 'Content-Type': 'application/json' } });
      const json = await res.json();
      if (json.ok) {
        setSaved(true);
      } else {
        throw new Error((json.error && json.error.message) || 'Save failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <BrandProfileForm initial={initial ?? undefined} onSubmit={handleSubmit} busy={busy} />
      {loading ? <p className="mt-3 text-sm text-neutral-500">Loading</p> : null}
      {saved ? <p className="mt-3 text-sm text-emerald-800">Saved.</p> : null}
    </div>
  );
}
