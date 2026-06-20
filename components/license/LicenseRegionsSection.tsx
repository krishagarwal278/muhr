"use client";

import { ChipSelect } from "@/components/ui/chip-select";
import { LICENSE_TERRITORIES } from "@/lib/license/territories";

const REGION_OPTIONS = LICENSE_TERRITORIES.map((t) => ({ id: t, label: t }));

export function LicenseRegionsSection({
  selected,
  onChange,
  copy,
}: {
  selected: string[];
  onChange: (regions: string[]) => void;
  copy: { label: string; hint: string };
}) {
  return (
    <div className="space-y-2 border-b border-black/10 pb-4">
      <div>
        <p className="text-sm font-medium text-neutral-950">{copy.label}</p>
        {copy.hint ? <p className="mt-0.5 text-xs text-neutral-600">{copy.hint}</p> : null}
      </div>
      <ChipSelect options={REGION_OPTIONS} selected={selected} onChange={onChange} />
    </div>
  );
}
