import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicSiteBaseUrl } from "@/lib/app/publicSiteUrl";
import { isBrandWorkspaceUser } from "@/lib/brand/brandPreviewSignIn";
import { sanitizeProfileLinks, type ProfileLinkInput } from "@/lib/profile/links";
import { createServerClient, getUser } from "@/lib/supabase/server";
import { PublicCreatorClient } from "./PublicCreatorClient";

type RpcRow = {
  profile_id: string;
  profile_handle: string;
  profile_display_name: string;
  profile_accepting_requests: boolean;
  /** Present after migration `007_profiles_licensing_notes_and_request_terms.sql`; older RPC rows omit this. */
  profile_licensing_notes?: string | null;
  /** Present after migration `020_public_profile_min_fee.sql`; older RPC rows omit this. */
  profile_min_license_fee_inr?: number | null;
  /** Present after migration `026_profile_links.sql`; older RPC rows omit this. */
  profile_links?: unknown;
};

function normalizeRpcRow(data: unknown): RpcRow | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    const first = data[0];
    if (!first || typeof first !== "object") return null;
    return first as RpcRow;
  }
  if (typeof data === "object") return data as RpcRow;
  return null;
}

export default async function PublicCreatorPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: raw } = await params;
  const handle = decodeURIComponent(raw).trim();
  if (!handle) notFound();

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("get_public_profile", { p_handle: handle });

  if (error) {
    console.error("get_public_profile:", error);
    notFound();
  }

  const row = normalizeRpcRow(data);
  if (!row?.profile_handle) notFound();

  const user = await getUser();
  const signedInBrandEmail =
    user?.email && isBrandWorkspaceUser(user.email) ? user.email.trim() : null;

  const profile = {
    id: row.profile_id,
    handle: row.profile_handle,
    displayName: row.profile_display_name || row.profile_handle,
    acceptingRequests: row.profile_accepting_requests !== false,
    licensingNotes: row.profile_licensing_notes?.trim() || null,
    minLicenseFeeInr:
      typeof row.profile_min_license_fee_inr === "number" &&
      row.profile_min_license_fee_inr > 0
        ? row.profile_min_license_fee_inr
        : null,
    profileLinks:
      (() => {
        const parsed = sanitizeProfileLinks(row.profile_links ?? []);
        return parsed.ok ? parsed.data : ([] as ProfileLinkInput[]);
      })(),
  };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const requestOrigin = host
    ? `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")}://${host}`
    : null;
  const publicSiteBase = getPublicSiteBaseUrl(requestOrigin);
  const publicProfileUrl = `${publicSiteBase}/k/${profile.handle}`;

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-neutral-900/55">Loading…</div>
      }
    >
      <PublicCreatorClient
        profile={profile}
        viewerUserId={user?.id ?? null}
        signedInBrandEmail={signedInBrandEmail}
        publicProfileUrl={publicProfileUrl}
      />
    </Suspense>
  );
}
