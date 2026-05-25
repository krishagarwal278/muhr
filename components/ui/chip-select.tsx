"use client";

import { cx } from "@/lib/cx";

export interface ChipOption {
  id: string;
  label: string;
}

export interface ChipSelectProps {
  options: ChipOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  className?: string;
}

export function ChipSelect({
  options,
  selected,
  onChange,
  variant = "default",
  disabled,
  className,
}: ChipSelectProps) {
  function toggle(id: string) {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className={cx("flex flex-wrap gap-2", className)}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            disabled={disabled}
            className={cx(
              "rounded-full border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? variant === "danger"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-neutral-300 bg-neutral-100 text-neutral-950"
                : "border-black/10 bg-white text-neutral-700 hover:border-black/15 hover:bg-neutral-50"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
