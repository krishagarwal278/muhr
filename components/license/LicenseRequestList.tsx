import { EmptyState } from "@/components/ui/empty-state";
import { cx } from "@/lib/cx";

export function LicenseRequestList({
  empty,
  children,
  header,
  footer,
  className,
}: {
  empty: { title: string; description?: string };
  children: React.ReactNode[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  if (children.length === 0) {
    return (
      <div
        className={cx(
          "overflow-hidden rounded-2xl border border-neutral-300/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_-12px_rgba(15,23,42,0.1)]",
          className,
        )}
      >
        {header}
        <EmptyState title={empty.title} description={empty.description} className="px-5" />
      </div>
    );
  }

  return (
    <div
      className={cx(
        "overflow-hidden rounded-2xl border border-neutral-300/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_-12px_rgba(15,23,42,0.1)]",
        className,
      )}
    >
      {header}
      <ul className="divide-y divide-neutral-200">{children}</ul>
      {footer}
    </div>
  );
}
