import "server-only";

import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isBrandViewableDeliveredAsset } from "@/lib/vault/brandDeliveryPath";
import type { AssetType } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — all delivered assets for the brand user, grouped by creator.
 */
export async function GET() {
  try {
    const supabase = await createRouteClient();
    const user = await getRouteHandlerUser(supabase);

    if (!user) {
      return Response.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { data: requests, error: reqErr } = await supabase
      .from("license_requests")
      .select(
        "id, creator_id, brand_name, brand_company, status, duration_days, budget_inr, agreed_budget_inr, intended_use, contract_effective_at, brand_payment_cleared_at, brand_signed_contract_at, creator_signed_contract_at, created_at"
      )
      .or(`brand_user_id.eq.${user.id},brand_email.eq.${user.email}`)
      .in("status", ["accepted"])
      .order("created_at", { ascending: false });

    if (reqErr) {
      logger.error("brand_assets_requests_error", { code: reqErr.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Could not load licenses." } },
        { status: 500 }
      );
    }

    if (!requests || requests.length === 0) {
      return Response.json({ ok: true, data: { creators: [] } });
    }

    const requestIds = requests.map((r) => r.id);
    const creatorIds = [...new Set(requests.map((r) => r.creator_id))];

    const admin = createServiceRoleClient();
    const profileClient = admin ?? supabase;

    const { data: profiles } = await profileClient
      .from("profiles")
      .select("id, display_name, handle")
      .in("id", creatorIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const dbClient = admin ?? supabase;

    const { data: deliveries, error: delErr } = await dbClient
      .from("license_deliveries")
      .select("id, license_request_id, vault_asset_id, delivered_at")
      .in("license_request_id", requestIds)
      .order("delivered_at", { ascending: true });

    if (delErr) {
      logger.error("brand_assets_deliveries_error", { code: delErr.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Could not load deliveries." } },
        { status: 500 }
      );
    }

    const assetIds = [...new Set((deliveries ?? []).map((d) => d.vault_asset_id))];

    let assetMap = new Map<
      string,
      {
        file_name: string;
        file_path: string;
        file_size: number;
        mime_type: string;
        asset_type: AssetType;
        encryption_key_id?: string | null;
        share_file_path?: string | null;
        original_mime_type?: string | null;
      }
    >();

    if (assetIds.length > 0) {
      const storageClient = admin ?? supabase;
      const { data: assets } = await storageClient
        .from("vault_assets")
        .select(
          "id, file_name, file_path, file_size, mime_type, asset_type, encryption_key_id, share_file_path, original_mime_type"
        )
        .in("id", assetIds);

      assetMap = new Map((assets ?? []).map((a) => [a.id, a]));
    }

    type CreatorGroup = {
      creator_id: string;
      display_name: string | null;
      handle: string | null;
      licenses: Array<{
        id: string;
        status: string;
        duration_days: number;
        budget_inr: number | null;
        intended_use: string;
        contract_effective_at: string | null;
        brand_payment_cleared_at: string | null;
        brand_signed_contract_at: string | null;
        creator_signed_contract_at: string | null;
        delivery_count: number;
        deliveries: Array<{
          id: string;
          vault_asset_id: string;
          delivered_at: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          asset_type: string;
          brand_view_ready: boolean;
        }>;
      }>;
    };

    const creatorMap = new Map<string, CreatorGroup>();

    for (const req of requests) {
      const profile = profileMap.get(req.creator_id);
      if (!creatorMap.has(req.creator_id)) {
        creatorMap.set(req.creator_id, {
          creator_id: req.creator_id,
          display_name: profile?.display_name ?? null,
          handle: profile?.handle ?? null,
          licenses: [],
        });
      }

      const reqDeliveries = (deliveries ?? [])
        .filter((d) => d.license_request_id === req.id)
        .map((d) => {
          const asset = assetMap.get(d.vault_asset_id);
          return asset
            ? {
                id: d.id,
                vault_asset_id: d.vault_asset_id,
                delivered_at: d.delivered_at,
                file_name: asset.file_name,
                file_size: asset.file_size,
                mime_type: asset.mime_type,
                asset_type: asset.asset_type,
                brand_view_ready: isBrandViewableDeliveredAsset(asset),
              }
            : null;
        })
        .filter(Boolean) as CreatorGroup["licenses"][number]["deliveries"];

      creatorMap.get(req.creator_id)!.licenses.push({
        id: req.id,
        status: req.status,
        duration_days: req.duration_days,
        budget_inr: req.agreed_budget_inr ?? req.budget_inr,
        intended_use: req.intended_use,
        contract_effective_at: req.contract_effective_at,
        brand_payment_cleared_at: req.brand_payment_cleared_at,
        brand_signed_contract_at: req.brand_signed_contract_at,
        creator_signed_contract_at: req.creator_signed_contract_at,
        delivery_count: reqDeliveries.length,
        deliveries: reqDeliveries,
      });
    }

    return Response.json({
      ok: true,
      data: { creators: Array.from(creatorMap.values()) },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
