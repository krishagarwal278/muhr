"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { appPageHeaderVariants, appPageTitleVariants } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Alert } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading";
import { ChipSelect, type ChipOption } from "@/components/ui/chip-select";
import { ToggleField } from "@/components/ui/toggle";
import { FormSelect } from "@/components/ui/form-select";
import { FormField } from "@/components/ui/form-field";

interface ConsentRules {
  channels: string[];
  territories: string[];
  blockedCategories: string[];
  allowVoiceSynthesis: boolean;
  allowFaceReenactment: boolean;
  requireApprovalPerUse: boolean;
  defaultDurationDays: number;
}

const channelOptions: ChipOption[] = [
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

const territoryOptions: ChipOption[] = [
  { id: "IN", label: "India" },
  { id: "US", label: "United States" },
  { id: "UK", label: "United Kingdom" },
  { id: "UAE", label: "UAE" },
  { id: "global", label: "Global" },
];

const blockedCategoryOptions: ChipOption[] = [
  { id: "politics", label: "Political content" },
  { id: "alcohol", label: "Alcohol" },
  { id: "gambling", label: "Gambling" },
  { id: "tobacco", label: "Tobacco" },
  { id: "cryptocurrency", label: "Cryptocurrency" },
];

const DEFAULT_RULES: ConsentRules = {
  channels: [],
  territories: [],
  blockedCategories: ["politics"],
  allowVoiceSynthesis: false,
  allowFaceReenactment: false,
  requireApprovalPerUse: true,
  defaultDurationDays: 90,
};

export default function ConsentPage() {
  const [rules, setRules] = useState<ConsentRules>(DEFAULT_RULES);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRules() {
      try {
        const res = await fetch("/api/consent");
        const json = await res.json();
        if (json.ok && json.data) {
          setRules(json.data);
        } else if (!json.ok && json.error) {
          console.error("Failed to load consent rules:", json.error);
        }
      } catch (error) {
        console.error("Failed to load consent rules:", error);
      } finally {
        setLoading(false);
      }
    }
    loadRules();
  }, []);

  function updateRules<K extends keyof ConsentRules>(key: K, value: ConsentRules[K]) {
    setRules((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      const res = await fetch("/api/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });
      const json = await res.json();
      
      if (json.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(json.error?.message || "Failed to save rules");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className={appPageHeaderVariants()}>
        <div>
          <h1 className={appPageTitleVariants()}>Consent rules</h1>
          <p className="mt-1 text-sm text-neutral-700">
            Define how your identity can be used
          </p>
        </div>
        <Link
          href="/consent/history"
          className="text-sm text-neutral-600 hover:text-neutral-950"
        >
          View history
        </Link>
      </header>

      <div className="space-y-6">
        <SectionCard
          title="Allowed channels"
          description="Select where your likeness can appear"
        >
          <ChipSelect
            options={channelOptions}
            selected={rules.channels}
            onChange={(channels) => updateRules("channels", channels)}
          />
        </SectionCard>

        <SectionCard
          title="Allowed territories"
          description="Geographic regions where your likeness can be used"
        >
          <ChipSelect
            options={territoryOptions}
            selected={rules.territories}
            onChange={(territories) => updateRules("territories", territories)}
          />
        </SectionCard>

        <SectionCard
          title="Blocked categories"
          description="Content types where your likeness cannot be used"
        >
          <ChipSelect
            options={blockedCategoryOptions}
            selected={rules.blockedCategories}
            onChange={(categories) => updateRules("blockedCategories", categories)}
            variant="danger"
          />
        </SectionCard>

        <SectionCard
          title="AI permissions"
          description="Control AI-generated content using your identity"
        >
          <div className="space-y-4">
            <ToggleField
              label="Voice synthesis"
              description="Allow AI to clone your voice"
              checked={rules.allowVoiceSynthesis}
              onChange={(checked) => updateRules("allowVoiceSynthesis", checked)}
            />
            <ToggleField
              label="Face reenactment"
              description="Allow AI to animate your face"
              checked={rules.allowFaceReenactment}
              onChange={(checked) => updateRules("allowFaceReenactment", checked)}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Approval settings"
        >
          <div className="space-y-4">
            <ToggleField
              label="Require approval per use"
              description="Review each license request individually"
              checked={rules.requireApprovalPerUse}
              onChange={(checked) => updateRules("requireApprovalPerUse", checked)}
            />
            <FormField
              label="Default license duration"
              description="How long licenses last by default"
            >
              <FormSelect
                value={rules.defaultDurationDays}
                onChange={(e) => updateRules("defaultDurationDays", Number(e.target.value))}
                className="max-w-xs"
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </FormSelect>
            </FormField>
          </div>
        </SectionCard>

        <div className="flex items-center justify-end gap-4">
          {saveSuccess && (
            <Alert variant="success" icon={false} className="flex-1">
              Rules saved successfully!
            </Alert>
          )}
          {saveError && (
            <Alert variant="error" icon={false} className="flex-1">
              {saveError}
            </Alert>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-neutral-950 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-900 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save rules"}
          </button>
        </div>
      </div>
    </div>
  );
}
