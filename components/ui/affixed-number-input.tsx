"use client";

import { FormNumberInput } from "@/components/ui/form-number-input";
import { cx } from "@/lib/cx";

export function AffixedNumberInput({
  prefix,
  suffix,
  value,
  onChange,
  min,
  max,
  placeholder = "0",
  ariaLabel,
  className,
}: {
  prefix?: string;
  suffix?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={cx("flex min-w-[10rem] items-center gap-2", className)}>
      {prefix ? <span className="text-sm text-neutral-500">{prefix}</span> : null}
      <FormNumberInput
        size="sm"
        value={value}
        onChange={(next) => {
          if (next != null && min != null && next < min) return;
          if (next != null && max != null && next > max) return;
          onChange(next);
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="tabular-nums"
      />
      {suffix ? <span className="shrink-0 text-xs text-neutral-500">{suffix}</span> : null}
    </div>
  );
}
