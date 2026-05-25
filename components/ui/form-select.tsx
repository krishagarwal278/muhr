import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cx } from "@/lib/cx";

export const formSelectVariants = cva(
  "w-full appearance-none rounded-lg border bg-white text-neutral-950 outline-none transition disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "border-black/10 focus:border-black/20",
        error: "border-red-300 focus:border-red-400",
      },
      size: {
        sm: "px-3 py-1.5 pr-8 text-sm",
        md: "px-4 py-2.5 pr-10 text-sm",
        lg: "px-4 py-3 pr-10 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface FormSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof formSelectVariants> {}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cx(formSelectVariants({ variant, size }), className)}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="h-4 w-4 text-neutral-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
    );
  }
);

FormSelect.displayName = "FormSelect";
