import { appPageTitleVariants } from "@/components/ui/page-header";

export default function BrandSettingsPage() {
  return (
    <div>
      <h1 className={appPageTitleVariants()}>Settings</h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-600">
        Team invites, company profile, and org settings will live here after the multi-org migration.
      </p>
    </div>
  );
}
