import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createServerClient, getUser } from "@/lib/supabase/server";
import { PublicCreatorClient } from "./PublicCreatorClient";

type RpcRow = {
  profile_id: string;
  profile_handle: string;
  profile_display_name: string;
  profile_accepting_requests: boolean;
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

  const profile = {
    id: row.profile_id,
    handle: row.profile_handle,
    displayName: row.profile_display_name || row.profile_handle,
    acceptingRequests: row.profile_accepting_requests !== false,
  };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const fallbackOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const origin = host
    ? `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")}://${host}`
    : fallbackOrigin;
  const publicProfileUrl = `${origin}/k/${profile.handle}`;

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-neutral-900/55">Loading…</div>
      }
    >
      <PublicCreatorClient
        profile={profile}
        viewerUserId={user?.id ?? null}
        publicProfileUrl={publicProfileUrl}
      />
    </Suspense>
  );
}
