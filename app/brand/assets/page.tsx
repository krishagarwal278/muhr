import { appPageTitleVariants } from "@/components/ui/page-header";

export default function BrandAssetsPage() {
  return (
    <div>
      <h1 className={appPageTitleVariants()}>Assets</h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-600">
        Licensed vault assets and signed-URL delivery will show here once the brand org APIs are connected.
      </p>
    </div>
  );
}
