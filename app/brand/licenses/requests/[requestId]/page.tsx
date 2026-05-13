import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { LicenseRequestWorkspace } from "@/app/(app)/licenses/requests/[requestId]/LicenseRequestWorkspace";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function BrandLicenseRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  if (!UUID_RE.test(requestId)) {
    notFound();
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const access = await getLicenseWorkspaceAccess(supabase, user, requestId);
  if (!access || access.role !== "brand") {
    notFound();
  }

  return (
    <LicenseRequestWorkspace
      initialRequest={access.row}
      viewerRole="brand"
      backHref="/brand/licenses"
      backLabel="Back to Licenses"
    />
  );
}
