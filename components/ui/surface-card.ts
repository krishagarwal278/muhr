import { cva, type VariantProps } from "class-variance-authority";

export const surfaceCardVariants = cva(
  "border border-neutral-200/90 bg-white text-neutral-950 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.06)]",
  {
    variants: {
      radius: {
        xl: "rounded-xl",
        "2xl": "rounded-2xl",
      },
      padding: {
        none: "",
        md: "p-5",
        auth: "p-6 sm:p-8",
      },
      interactive: {
        none: "",
        subtle:
          "transition hover:border-neutral-300/90 hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]",
        emphasized:
          "group transition hover:border-neutral-300/90 hover:shadow-[0_4px_16px_-4px_rgba(15,23,42,0.08)]",
      },
    },
    defaultVariants: {
      radius: "xl",
      padding: "md",
      interactive: "none",
    },
  },
);

export type SurfaceCardVariantProps = VariantProps<typeof surfaceCardVariants>;
