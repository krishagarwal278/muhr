import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cx } from "@/lib/cx";

export const formTextareaVariants = cva(
  "w-full resize-y rounded-lg border bg-white text-neutral-950 outline-none transition placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "border-black/10 focus:border-black/20",
        error: "border-red-300 focus:border-red-400",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2.5 text-sm",
        lg: "px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof formTextareaVariants> {}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cx(formTextareaVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

FormTextarea.displayName = "FormTextarea";
