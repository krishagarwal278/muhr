import { cx } from "@/lib/cx";

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-3",
};

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <div
      className={cx(
        "animate-spin rounded-full border-neutral-300 border-t-neutral-900",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export interface LoadingSkeletonProps {
  className?: string;
  variant?: "text" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
}

export function LoadingSkeleton({
  className,
  variant = "text",
  width,
  height,
}: LoadingSkeletonProps) {
  const baseClasses = "animate-pulse bg-black/10";
  
  const variantClasses = {
    text: "h-4 rounded",
    circle: "rounded-full",
    rect: "rounded-lg",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={cx(baseClasses, variantClasses[variant], className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({ message, className }: LoadingOverlayProps) {
  return (
    <div
      className={cx(
        "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm",
        className
      )}
    >
      <LoadingSpinner size="lg" />
      {message && (
        <p className="text-sm text-neutral-600">{message}</p>
      )}
    </div>
  );
}
