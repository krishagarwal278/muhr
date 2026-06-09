import { cx } from "@/lib/cx";
import type { BrandAvatarTone } from "@/lib/landing/landingContent";

type BrandAvatarProps = {
  letter: string;
  tone: BrandAvatarTone;
  size?: "sm" | "md";
  className?: string;
};

export function BrandAvatar({ letter, tone, size = "md", className }: BrandAvatarProps) {
  return (
    <span
      className={cx("brand-avatar", size, tone, className)}
      aria-hidden
    >
      {letter}
    </span>
  );
}
