import { cx } from "@/lib/cx";

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cx("py-12 text-center", className)}>
      <p className="text-sm font-medium text-neutral-800">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-600">{description}</p>
      ) : null}
    </div>
  );
}
