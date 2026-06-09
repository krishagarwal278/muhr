import Image from "next/image";
import { cx } from "@/lib/cx";

type MuhrLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function MuhrLogo({ size = 30, className, priority }: MuhrLogoProps) {
  return (
    <Image
      src="/MUHR_LOGO.png"
      alt="Muhr"
      width={size}
      height={size}
      priority={priority}
      className={cx("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
