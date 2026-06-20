import { EmptyState } from "@/components/ui/empty-state";

export function LicenseRequestList({
  empty,
  children,
}: {
  empty: { title: string; description?: string };
  children: React.ReactNode[];
}) {
  if (children.length === 0) {
    return <EmptyState title={empty.title} description={empty.description} />;
  }

  return <ul className="space-y-3">{children}</ul>;
}
