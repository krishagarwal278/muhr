import { Suspense } from "react";
import { LicensesHub } from "@/components/license/LicensesHub";
import type { LicenseHubTab } from "@/components/license/LicenseHubTabs";

export default function LicensesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense fallback={<div className="h-24 animate-pulse rounded-xl border border-black/10 bg-neutral-100" />}>
      <LicensesPageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function LicensesPageInner({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = params.tab as LicenseHubTab | undefined;

  return <LicensesHub initialTab={initialTab} />;
}
