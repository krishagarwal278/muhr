import { cva, type VariantProps } from "class-variance-authority";

/** Solid light CTA on dark surfaces (white fill, black label). */
export const primaryButtonVariants = cva(
  "inline-flex items-center justify-center rounded-lg bg-white font-medium text-black transition hover:opacity-90 disabled:opacity-60",
  {
    variants: {
      size: {
        sm: "px-4 py-2 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-2.5 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type PrimaryButtonVariantProps = VariantProps<typeof primaryButtonVariants>;

/** Muted bordered control (e.g. tour trigger). */
export const ghostButtonVariants = cva(
  "group inline-flex items-center gap-2 rounded-lg border border-neutral-200/90 bg-white px-3.5 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-950",
);
