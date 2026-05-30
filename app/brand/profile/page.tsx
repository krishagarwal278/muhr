import BrandProfilePageClient from "@/components/brand/BrandProfilePage";
import { appPageTitleVariants } from "@/components/ui/page-header";

export default function BrandProfilePage() {
  return (
    <div>
      <h1 className={appPageTitleVariants()}>Profile</h1>
      <p className="mt-2 text-sm text-neutral-600">Company details, contacts, and verification materials for your brand workspace.</p>
      <div className="mt-6 max-w-3xl">
        <BrandProfilePageClient />
      </div>
    </div>
  );
}
