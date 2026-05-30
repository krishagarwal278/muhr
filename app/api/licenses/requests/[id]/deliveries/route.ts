import "server-only";

import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { toApiError, ApiHttpError } from "@/lib/errors/apiError";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { logger } from "@/lib/logger";
import {
  brandDeliveryMimeType,
  brandDeliveryStoragePath,
  isBrandViewableDeliveredAsset,
} from "@/lib/vault/brandDeliveryPath";
import { ensureBrandShareCopy } from "@/lib/vault/ensureBrandShareCopy";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — list delivered assets for a license request.
 * Both creator and brand can read; brand gets service-role signed URLs.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: requestId } = await ctx.params;
    const supabase = await createRouteClient();
    const user = await getRouteHandlerUser(supabase);

    if (!user) {
      return Response.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const access = await getLicenseWorkspaceAccess(supabase, user, requestId);
    if (!access) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "License request not found." } },
        { status: 404 }
      );
    }

    const admin = createServiceRoleClient();
    const dbClient = admin ?? supabase;

    const { data: deliveries, error } = await dbClient
      .from("license_deliveries")
      .select("id, license_request_id, vault_asset_id, delivered_by, delivered_at")
      .eq("license_request_id", requestId)
      .order("delivered_at", { ascending: true });

    if (error) {
      logger.error("deliveries_fetch_error", { requestId, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Could not load deliveries." } },
        { status: 500 }
      );
    }

    if (!deliveries || deliveries.length === 0) {
      return Response.json({ ok: true, data: { deliveries: [] } });
    }

    const assetIds = deliveries.map((d) => d.vault_asset_id);
    const storageClient = admin ?? supabase;

    const { data: assets } = await storageClient
      .from("vault_assets")
      .select(
        "id, file_name, file_path, file_size, mime_type, asset_type, encryption_key_id, share_file_path, original_mime_type"
      )
      .in("id", assetIds);

    const assetMap = new Map((assets ?? []).map((a) => [a.id, a]));

    const isBrand = access.role === "brand";

    const enriched = await Promise.all(
      deliveries.map(async (d) => {
        const asset = assetMap.get(d.vault_asset_id);
        if (!asset) return null;

        let signed_url: string | null = null;
        let view_blocked = false;
        let view_blocked_reason: string | null = null;

        if (isBrand) {
          const deliveryPath = brandDeliveryStoragePath(asset);
          if (deliveryPath) {
            const { data: urlData } = await storageClient.storage
              .from("assets")
              .createSignedUrl(deliveryPath, 3600);
            signed_url = urlData?.signedUrl ?? null;
          } else if (!isBrandViewableDeliveredAsset(asset)) {
            view_blocked = true;
            view_blocked_reason =
              asset.asset_type === "character_sheet" && asset.encryption_key_id
                ? "Waiting for the creator to publish a viewable copy of this character sheet."
                : "This asset cannot be opened by brands.";
          }
        }

        return {
          ...d,
          file_name: asset.file_name,
          file_path: asset.file_path,
          file_size: asset.file_size,
          mime_type: brandDeliveryMimeType(asset),
          asset_type: asset.asset_type,
          signed_url,
          view_blocked,
          view_blocked_reason,
          brand_view_ready: isBrandViewableDeliveredAsset(asset),
        };
      })
    );

    return Response.json({
      ok: true,
      data: { deliveries: enriched.filter(Boolean) },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

/**
 * POST — creator delivers vault assets to a license request.
 * Body: { vault_asset_ids: string[] }
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: requestId } = await ctx.params;
    const supabase = await createRouteClient();
    const user = await getRouteHandlerUser(supabase);

    if (!user) {
      return Response.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const access = await getLicenseWorkspaceAccess(supabase, user, requestId);
    if (!access) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "License request not found." } },
        { status: 404 }
      );
    }

    if (access.role !== "creator") {
      throw new ApiHttpError(403, "forbidden", "Only the creator can deliver assets.");
    }

    if (access.row.status !== "accepted") {
      throw new ApiHttpError(400, "bad_state", "License must be accepted before delivering assets.");
    }

    const body = await request.json().catch(() => null);
    const vaultAssetIds: string[] = body?.vault_asset_ids;

    if (!Array.isArray(vaultAssetIds) || vaultAssetIds.length === 0) {
      throw new ApiHttpError(400, "invalid_input", "Provide at least one vault_asset_id.");
    }

    if (vaultAssetIds.length > 20) {
      throw new ApiHttpError(400, "invalid_input", "Maximum 20 assets per delivery.");
    }

    const { data: ownedAssets, error: assetErr } = await supabase
      .from("vault_assets")
      .select("id, user_id, file_path, archived_at, encryption_key_id, asset_type, share_file_path")
      .eq("user_id", user.id)
      .in("id", vaultAssetIds);

    if (assetErr) {
      logger.error("delivery_asset_check_error", { requestId, code: assetErr.code });
      throw new ApiHttpError(500, "db_error", "Could not verify assets.");
    }

    const ownedIds = new Set((ownedAssets ?? []).map((a) => a.id));
    const unowned = vaultAssetIds.filter((id) => !ownedIds.has(id));
    if (unowned.length > 0) {
      throw new ApiHttpError(400, "invalid_assets", "Some assets were not found in your vault.");
    }

    const nonDeliverable = (ownedAssets ?? []).filter(
      (a) =>
        a.archived_at ||
        (a.asset_type === "face_photo" && a.encryption_key_id) ||
        (a.asset_type === "character_sheet" && a.encryption_key_id && !a.share_file_path)
    );
    if (nonDeliverable.length > 0) {
      throw new ApiHttpError(
        400,
        "non_deliverable",
        "Some assets cannot be delivered. Regenerate legacy encrypted character sheets from Vault first."
      );
    }

    const rows = vaultAssetIds.map((assetId) => ({
      license_request_id: requestId,
      vault_asset_id: assetId,
      delivered_by: user.id,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("license_deliveries")
      .upsert(rows, { onConflict: "license_request_id,vault_asset_id" })
      .select("id, license_request_id, vault_asset_id, delivered_by, delivered_at");

    if (insertErr) {
      logger.error("delivery_insert_error", { requestId, code: insertErr.code });
      throw new ApiHttpError(500, "db_error", "Could not deliver assets.");
    }

    const admin = createServiceRoleClient();
    const storageClient = admin ?? supabase;
    const dbClient = admin ?? supabase;

    for (const asset of ownedAssets ?? []) {
      await ensureBrandShareCopy(storageClient, dbClient, asset, requestId);
    }

    logger.warn("assets_delivered", {
      requestId,
      creatorId: user.id,
      assetCount: vaultAssetIds.length,
    });

    return Response.json({ ok: true, data: { deliveries: inserted } }, { status: 201 });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

/**
 * DELETE — creator revokes a delivered asset.
 * Body: { vault_asset_id: string }
 */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: requestId } = await ctx.params;
    const supabase = await createRouteClient();
    const user = await getRouteHandlerUser(supabase);

    if (!user) {
      return Response.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const vaultAssetId: string = body?.vault_asset_id;

    if (!vaultAssetId || typeof vaultAssetId !== "string") {
      throw new ApiHttpError(400, "invalid_input", "Provide a vault_asset_id.");
    }

    const { error } = await supabase
      .from("license_deliveries")
      .delete()
      .eq("license_request_id", requestId)
      .eq("vault_asset_id", vaultAssetId)
      .eq("delivered_by", user.id);

    if (error) {
      logger.error("delivery_delete_error", { requestId, code: error.code });
      throw new ApiHttpError(500, "db_error", "Could not revoke delivery.");
    }

    return Response.json({ ok: true, data: { removed: vaultAssetId } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
