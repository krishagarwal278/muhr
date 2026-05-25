import { cva, type VariantProps } from "class-variance-authority";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./icon";

export const alertVariants = cva(
  "rounded-lg border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        info: "border-sky-200 bg-sky-50 text-sky-900",
        success: "border-emerald-200 bg-emerald-50 text-emerald-900",
        warning: "border-amber-200 bg-amber-50 text-amber-900",
        error: "border-red-200 bg-red-50 text-red-900",
        neutral: "border-neutral-200 bg-neutral-50 text-neutral-900",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

const iconMap: Record<NonNullable<VariantProps<typeof alertVariants>["variant"]>, IconName> = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "error",
  neutral: "info",
};

const iconColorMap: Record<NonNullable<VariantProps<typeof alertVariants>["variant"]>, string> = {
  info: "text-sky-600",
  success: "text-emerald-600",
  warning: "text-amber-600",
  error: "text-red-600",
  neutral: "text-neutral-600",
};

export interface AlertProps extends VariantProps<typeof alertVariants> {
  title?: string;
  children?: React.ReactNode;
  icon?: IconName | false;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  icon,
  className,
}: AlertProps) {
  const showIcon = icon !== false;
  const iconName = icon || iconMap[variant || "info"];
  const iconColor = iconColorMap[variant || "info"];

  return (
    <div className={cx(alertVariants({ variant }), className)} role="alert">
      <div className="flex gap-3">
        {showIcon && (
          <Icon
            name={iconName}
            size="md"
            className={cx("shrink-0", iconColor)}
          />
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-medium">{title}</p>
          )}
          {children && (
            <div className={cx(title && "mt-1", "text-sm/relaxed opacity-90")}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
