"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type ConsentRules = {
  channels: string[];
  territories: string[];
  blockedCategories: string[];
  allowVoiceSynthesis: boolean;
  allowFaceReenactment: boolean;
  requireApprovalPerUse: boolean;
  defaultDurationDays: number;
};

const channelOptions = [
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "X / Twitter" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "digital_ads", label: "Digital Ads" },
  { id: "tv", label: "TV / OTT" },
  { id: "print", label: "Print" },
];

const territoryOptions = [
  { id: "IN", label: "India" },
  { id: "US", label: "United States" },
  { id: "UK", label: "United Kingdom" },
  { id: "UAE", label: "UAE" },
  { id: "global", label: "Global" },
];

const blockedCategoryOptions = [
  { id: "politics", label: "Political content" },
  { id: "alcohol", label: "Alcohol" },
  { id: "gambling", label: "Gambling" },
  { id: "tobacco", label: "Tobacco" },
  { id: "adult", label: "Adult content" },
  { id: "cryptocurrency", label: "Cryptocurrency" },
];

export default function ConsentPage() {
  const [rules, setRules] = useState<ConsentRules>({
    channels: [],
    territories: [],
    blockedCategories: ["politics", "adult"],
    allowVoiceSynthesis: false,
    allowFaceReenactment: false,
    requireApprovalPerUse: true,
    defaultDurationDays: 90,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadRules() {
      try {
        const res = await fetch("/api/consent");
        const data = await res.json();
        if (!data.error) {
          setRules(data);
        }
      } catch (error) {
        console.error("Failed to load consent rules:", error);
      } finally {
        setLoading(false);
      }
    }
    loadRules();
  }, []);

  function toggleArrayItem(key: keyof ConsentRules, item: string) {
    const arr = rules[key] as string[];
    setRules({
      ...rules,
      [key]: arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item],
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save consent rules:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-neutral-950" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Consent rules</h1>
          <p className="mt-1 text-sm text-neutral-900/60">
            Define how your identity can be used
          </p>
        </div>
        <Link
          href="/consent/history"
          className="text-sm text-neutral-900/60 hover:text-neutral-950"
        >
          View history
        </Link>
      </div>

      <div className="space-y-6">
        {/* Allowed channels */}
        <div className="rounded-xl border border-black/10 bg-white/70 p-6">
          <h2 className="text-lg font-medium">Allowed channels</h2>
          <p className="mt-1 text-sm text-neutral-900/55">
            Select where your likeness can appear
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {channelOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => toggleArrayItem("channels", opt.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  rules.channels.includes(opt.id)
                    ? "border-black/15 bg-black/5 text-neutral-950"
                    : "border-black/10 bg-white/70 text-neutral-900/70 hover:border-black/15 hover:bg-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Territories */}
        <div className="rounded-xl border border-black/10 bg-white/70 p-6">
          <h2 className="text-lg font-medium">Allowed territories</h2>
          <p className="mt-1 text-sm text-neutral-900/55">
            Geographic regions where your likeness can be used
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {territoryOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => toggleArrayItem("territories", opt.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  rules.territories.includes(opt.id)
                    ? "border-black/15 bg-black/5 text-neutral-950"
                    : "border-black/10 bg-white/70 text-neutral-900/70 hover:border-black/15 hover:bg-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blocked categories */}
        <div className="rounded-xl border border-black/10 bg-white/70 p-6">
          <h2 className="text-lg font-medium">Blocked categories</h2>
          <p className="mt-1 text-sm text-neutral-900/55">
            Content types where your likeness cannot be used
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {blockedCategoryOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => toggleArrayItem("blockedCategories", opt.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  rules.blockedCategories.includes(opt.id)
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-black/10 bg-white/70 text-neutral-900/70 hover:border-black/15 hover:bg-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI permissions */}
        <div className="rounded-xl border border-black/10 bg-white/70 p-6">
          <h2 className="text-lg font-medium">AI permissions</h2>
          <p className="mt-1 text-sm text-neutral-900/55">
            Control AI-generated content using your identity
          </p>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium">Voice synthesis</p>
                <p className="text-sm text-neutral-900/55">Allow AI to clone your voice</p>
              </div>
              <button
                onClick={() => setRules({ ...rules, allowVoiceSynthesis: !rules.allowVoiceSynthesis })}
                className={`relative h-6 w-11 rounded-full transition ${
                  rules.allowVoiceSynthesis ? "bg-emerald-500" : "bg-black/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                    rules.allowVoiceSynthesis ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium">Face reenactment</p>
                <p className="text-sm text-neutral-900/55">Allow AI to animate your face</p>
              </div>
              <button
                onClick={() => setRules({ ...rules, allowFaceReenactment: !rules.allowFaceReenactment })}
                className={`relative h-6 w-11 rounded-full transition ${
                  rules.allowFaceReenactment ? "bg-emerald-500" : "bg-black/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                    rules.allowFaceReenactment ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* Approval settings */}
        <div className="rounded-xl border border-black/10 bg-white/70 p-6">
          <h2 className="text-lg font-medium">Approval settings</h2>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium">Require approval per use</p>
                <p className="text-sm text-neutral-900/55">Review each license request individually</p>
              </div>
              <button
                onClick={() => setRules({ ...rules, requireApprovalPerUse: !rules.requireApprovalPerUse })}
                className={`relative h-6 w-11 rounded-full transition ${
                  rules.requireApprovalPerUse ? "bg-emerald-500" : "bg-black/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                    rules.requireApprovalPerUse ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
            <div>
              <label className="font-medium">Default license duration</label>
              <p className="text-sm text-neutral-900/55">How long licenses last by default</p>
              <select
                value={rules.defaultDurationDays}
                onChange={(e) => setRules({ ...rules, defaultDurationDays: Number(e.target.value) })}
                className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none focus:border-black/15"
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm text-emerald-400">Rules saved successfully!</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-neutral-950 px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save rules"}
          </button>
        </div>
      </div>
    </div>
  );
}
