import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cx } from "@/lib/cx";

export const formInputVariants = cva(
  "w-full rounded-lg border bg-white text-neutral-950 outline-none transition placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "border-black/10 focus:border-black/20",
        error: "border-red-300 focus:border-red-400",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2.5 text-sm sm:text-base",
        lg: "px-4 py-3 text-base",
      },
      font: {
        default: "",
        mono: "font-mono",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      font: "default",
    },
  }
);

export interface FormInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof formInputVariants> {}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, variant, size, font, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cx(formInputVariants({ variant, size, font }), className)}
        {...props}
      />
    );
  }
);

FormInput.displayName = "FormInput";
