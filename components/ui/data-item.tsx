import { cx } from "@/lib/cx";

export interface DataItemProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  layout?: "stacked" | "horizontal";
}

export function DataItem({
  label,
  value,
  className,
  layout = "stacked",
}: DataItemProps) {
  if (layout === "horizontal") {
    return (
      <div className={cx("flex items-center justify-between", className)}>
        <dt className="text-sm text-neutral-700">{label}</dt>
        <dd className="text-sm font-medium text-neutral-950">{value}</dd>
      </div>
    );
  }

  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-neutral-950">{value}</dd>
    </div>
  );
}

export interface DataItemsGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

const columnClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function DataItemsGrid({
  children,
  columns = 2,
  className,
}: DataItemsGridProps) {
  return (
    <dl className={cx("grid gap-4", columnClasses[columns], className)}>
      {children}
    </dl>
  );
}
