import { notFound } from "next/navigation";
import {
  creatorRequestConstraintsFromRules,
  type CreatorRequestConstraints,
} from "@/lib/license/requestOptions";
import { logger } from "@/lib/logger";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RpcRow = {
  profile_allow_paid_social?: boolean | null;
  profile_allow_broadcast?: boolean | null;
  profile_allow_other?: boolean | null;
  profile_license_regions?: string[] | null;
  profile_default_duration_days?: number | null;
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ handle: string }> }
) {
  const { handle: raw } = await context.params;
  const handle = decodeURIComponent(raw).trim();
  if (!handle) notFound();

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("get_public_profile", { p_handle: handle });

  if (error) {
    logger.error("public_profile_request_options_rpc", { handle, code: error.code, message: error.message });
    notFound();
  }

  const row = normalizeRpcRow(data);
  if (!row) notFound();

  const constraints: CreatorRequestConstraints = creatorRequestConstraintsFromRules({
    allow_paid_social: row.profile_allow_paid_social,
    allow_broadcast: row.profile_allow_broadcast,
    allow_other: row.profile_allow_other,
    territories: row.profile_license_regions,
    default_duration_days: row.profile_default_duration_days,
  });

  return Response.json({ ok: true, data: constraints });
}
