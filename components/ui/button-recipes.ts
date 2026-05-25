import { cva, type VariantProps } from "class-variance-authority";

/** Solid light CTA on dark surfaces (white fill, black label). */
export const primaryButtonVariants = cva(
  "inline-flex items-center justify-center rounded-lg bg-white font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
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

/** Solid dark CTA on light app surfaces (e.g. Save, Submit). */
export const solidButtonVariants = cva(
  "inline-flex items-center justify-center rounded-lg bg-neutral-950 font-medium text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-2.5 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type SolidButtonVariantProps = VariantProps<typeof solidButtonVariants>;

/** Bordered secondary control on light surfaces (e.g. Edit, Cancel). */
export const outlineButtonVariants = cva(
  "inline-flex items-center justify-center rounded-lg border border-black/10 bg-white font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2.5 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type OutlineButtonVariantProps = VariantProps<typeof outlineButtonVariants>;

/** Destructive confirm (e.g. Decline, Delete). */
export const dangerButtonVariants = cva(
  "inline-flex items-center justify-center rounded-lg bg-red-600 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  },
);

export type DangerButtonVariantProps = VariantProps<typeof dangerButtonVariants>;

/** Muted bordered control with shadow (e.g. tour trigger, Log out). */
export const ghostButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200/90 bg-white font-medium text-neutral-800 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-3.5 py-2 text-sm",
        lg: "px-4 py-2 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type GhostButtonVariantProps = VariantProps<typeof ghostButtonVariants>;

/** Dialog / toolbar text dismiss (no border). */
export const subtleButtonVariants = cva(
  "inline-flex items-center justify-center rounded-lg font-medium text-neutral-700 transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      size: {
        sm: "px-3 py-2 text-sm",
        md: "px-3 py-2 text-sm",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  },
);

export type SubtleButtonVariantProps = VariantProps<typeof subtleButtonVariants>;
