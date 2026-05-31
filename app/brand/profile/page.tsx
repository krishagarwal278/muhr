import BrandProfilePageClient from "@/components/brand/BrandProfilePage";
import { appPageTitleVariants } from "@/components/ui/page-header";

export default function BrandProfilePage() {
  return (
    <section>
      <header className="max-w-3xl">
        <h1 className={appPageTitleVariants()}>Brand profile</h1>
        <p className="mt-2 text-sm text-neutral-600">Company details and verification for licensing.</p>
      </header>
      <section className="mt-8 max-w-5xl">
        <BrandProfilePageClient />
      </section>
    </section>
  );
}
