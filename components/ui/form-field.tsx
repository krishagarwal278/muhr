import { cx } from "@/lib/cx";

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  description?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  description,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cx("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-neutral-900"
        >
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </label>
      )}
      {children}
      {description && !error && (
        <p className="text-xs text-neutral-600">{description}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
