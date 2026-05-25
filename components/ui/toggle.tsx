"use client";

import { forwardRef } from "react";
import { cx } from "@/lib/cx";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

const sizeClasses = {
  sm: {
    track: "h-5 w-9",
    thumb: "h-4 w-4",
    thumbOn: "left-[18px]",
    thumbOff: "left-0.5",
  },
  md: {
    track: "h-6 w-11",
    thumb: "h-5 w-5",
    thumbOn: "left-[22px]",
    thumbOff: "left-0.5",
  },
};

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, disabled, size = "md", className, ...props }, ref) => {
    const sizes = sizeClasses[size];

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          sizes.track,
          checked ? "bg-emerald-500" : "bg-black/10",
          className
        )}
        {...props}
      >
        <span
          className={cx(
            "absolute top-0.5 rounded-full bg-white shadow-sm transition-all",
            sizes.thumb,
            checked ? sizes.thumbOn : sizes.thumbOff
          )}
        />
      </button>
    );
  }
);

Toggle.displayName = "Toggle";

export interface ToggleFieldProps extends ToggleProps {
  label: string;
  description?: string;
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
  disabled,
  size,
}: ToggleFieldProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-neutral-950">{label}</p>
        {description && (
          <p className="text-sm text-neutral-600">{description}</p>
        )}
      </div>
      <Toggle
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        size={size}
        aria-label={label}
      />
    </div>
  );
}
