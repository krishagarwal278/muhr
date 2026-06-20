"use client";

import { forwardRef, useCallback } from "react";
import { FormInput, type FormInputProps } from "@/components/ui/form-input";
import {
  formatIntegerInputText,
  parseFormattedInteger,
} from "@/lib/format/numberInput";

export type FormNumberInputProps = Omit<
  FormInputProps,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: number | null;
  onChange: (value: number | null) => void;
  /** When true, empty input becomes 0 instead of null. */
  emptyAsZero?: boolean;
};

export const FormNumberInput = forwardRef<HTMLInputElement, FormNumberInputProps>(
  ({ value, onChange, emptyAsZero = false, onBlur, ...props }, ref) => {
    const display = value == null ? "" : formatIntegerInputText(String(value));

    const commit = useCallback(
      (raw: string) => {
        const parsed = parseFormattedInteger(raw);
        if (parsed == null) {
          onChange(emptyAsZero ? 0 : null);
          return;
        }
        onChange(parsed);
      },
      [emptyAsZero, onChange]
    );

    return (
      <FormInput
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        className={props.className ?? "tabular-nums"}
        onChange={(e) => commit(e.target.value)}
        onBlur={(e) => {
          commit(e.target.value);
          onBlur?.(e);
        }}
        {...props}
      />
    );
  }
);

FormNumberInput.displayName = "FormNumberInput";

/** String-state helper for legacy forms that store display text. */
export function formatNumberFieldChange(raw: string): string {
  return formatIntegerInputText(raw);
}
