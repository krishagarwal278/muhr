"use client";

import { SectionCard } from "@/components/ui/section-card";
import { Alert } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading";
import { ToggleField } from "@/components/ui/toggle";
import { AffixedNumberInput } from "@/components/ui/affixed-number-input";
import { InlineLabeledField } from "@/components/ui/inline-labeled-field";
import { OtherUsageRuleSection } from "@/components/license/OtherUsageRuleSection";
import { LicenseRegionsSection } from "@/components/license/LicenseRegionsSection";
import { LICENSE_HUB_COPY } from "@/lib/license/hubContent";
import { RATE_FIELDS, USAGE_RULE_FIELDS } from "@/lib/license/rulesAndRatesFields";
import { useRulesAndRates } from "@/lib/license/useRulesAndRates";
import { cx } from "@/lib/cx";

const panelClass =
  "rounded-2xl border border-neutral-300/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_-12px_rgba(15,23,42,0.1)]";

export function RulesAndRatesPanel() {
  const { rules, loading, loadError, saving, saveSuccess, saveError, updateRules, save } =
    useRulesAndRates();
  const copy = LICENSE_HUB_COPY.rulesAndRates;
  const periodSuffix = `/ ${rules.ratePeriodDays}d`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Alert variant="error" className="max-w-xl">
        {loadError}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600">{LICENSE_HUB_COPY.tabs["rules-and-rates"].intro}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title={copy.rates.title}
          description={copy.rates.description}
          className={panelClass}
        >
          <div className="space-y-4">
            {RATE_FIELDS.map(({ key, label, hint }) => (
              <InlineLabeledField key={key} label={label} hint={hint}>
                <AffixedNumberInput
                  prefix="₹"
                  suffix={periodSuffix}
                  value={rules[key]}
                  onChange={(value) => updateRules(key, value)}
                  ariaLabel={label}
                />
              </InlineLabeledField>
            ))}
            <InlineLabeledField label="Exclusivity uplift" hint="Added for category exclusivity.">
              <AffixedNumberInput
                prefix="+"
                suffix="%"
                value={rules.exclusivityUpliftPercent}
                min={0}
                max={200}
                onChange={(value) => updateRules("exclusivityUpliftPercent", value ?? 0)}
                ariaLabel="Exclusivity uplift percent"
              />
            </InlineLabeledField>
          </div>
        </SectionCard>

        <SectionCard
          title={copy.usage.title}
          description={copy.usage.description}
          className={panelClass}
        >
          <div className="space-y-4">
            <LicenseRegionsSection
              selected={rules.territories}
              onChange={(regions) => updateRules("territories", regions)}
              copy={copy.regions}
            />
            {USAGE_RULE_FIELDS.map(({ key, label, hint }) => (
              <ToggleField
                key={key}
                label={label}
                description={hint}
                checked={rules[key]}
                onChange={(checked) => updateRules(key, checked)}
              />
            ))}
            <OtherUsageRuleSection
              allowOther={rules.allowOther}
              notes={rules.otherUsageNotes}
              onAllowOtherChange={(checked) => updateRules("allowOther", checked)}
              onNotesChange={(value) => updateRules("otherUsageNotes", value)}
              copy={copy.otherUsage}
            />
          </div>
        </SectionCard>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className={cx(
            "inline-flex items-center justify-center gap-2 rounded-full bg-[#2D5BFF] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2548d9] disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {saving ? "Saving…" : copy.saveLabel}
        </button>
        {saveSuccess ? (
          <Alert variant="success" icon={false} className="min-w-0 flex-1">
            Rules and rates saved.
          </Alert>
        ) : null}
        {saveError ? (
          <Alert variant="error" icon={false} className="min-w-0 flex-1">
            {saveError}
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
