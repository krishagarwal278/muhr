import { cva, type VariantProps } from "class-variance-authority";
import { cx } from "@/lib/cx";

export const statusBadgeVariants = cva(
  "rounded-full border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        active: "border-emerald-600/30 bg-emerald-50 text-emerald-900",
        neutral: "border-black/15 bg-neutral-100 text-neutral-800",
        danger: "border-red-300 bg-white text-red-900",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
);

export function StatusBadge({
  tone,
  children,
  className,
}: VariantProps<typeof statusBadgeVariants> & {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cx(statusBadgeVariants({ tone }), className)}>{children}</span>;
}
