import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { fetchCreatorOtherUsageNotes } from "@/lib/license/creatorOtherUsageNotes";
import { LicenseRequestWorkspace } from "@/app/(app)/licenses/requests/[requestId]/LicenseRequestWorkspace";

export const dynamic = "force-dynamic";

/** Accept UUID v1–v8 from Postgres / Supabase (strict RFC variant nibble is optional). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  if (!access) {
    notFound();
  }
  if (access.role === "creator") {
    redirect(`/licenses/requests/${requestId}`);
  }

  const creatorOtherUsageNotes = await fetchCreatorOtherUsageNotes(access.row.creator_id);

  return (
    <LicenseRequestWorkspace
      initialRequest={access.row}
      creatorOtherUsageNotes={creatorOtherUsageNotes}
      viewerRole="brand"
      backHref="/brand/licenses"
      backLabel="Back to Licenses"
    />
  );
}
