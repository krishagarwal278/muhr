import { forwardRef } from "react";
import { cx } from "@/lib/cx";

export interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const inputId = id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;
    
    if (!label) {
      return (
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={cx("accent-neutral-950", className)}
          {...props}
        />
      );
    }

    return (
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-start gap-3 text-sm"
      >
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={cx("mt-0.5 accent-neutral-950", className)}
          {...props}
        />
        <span>
          {typeof label === "string" ? (
            <span className="block font-medium text-neutral-950">{label}</span>
          ) : (
            label
          )}
          {description && (
            <span className="block text-xs text-neutral-600">{description}</span>
          )}
        </span>
      </label>
    );
  }
);

FormCheckbox.displayName = "FormCheckbox";
