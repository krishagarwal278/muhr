import "server-only";

import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { toApiError, ApiHttpError } from "@/lib/errors/apiError";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { saveBrandShareUpload } from "@/lib/vault/ensureBrandShareCopy";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST — creator uploads a plaintext brand-share copy for a delivered asset.
 * Used for legacy encrypted character sheets so brands can view/download.
 * Query: ?license_request_id=uuid
 */
export async function POST(request: Request, ctx: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await ctx.params;
    const licenseRequestId = new URL(request.url).searchParams.get("license_request_id");

    if (!licenseRequestId) {
      throw new ApiHttpError(400, "invalid_input", "Provide license_request_id.");
    }

    const supabase = await createRouteClient();
    const user = await getRouteHandlerUser(supabase);

    if (!user) {
      return Response.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const access = await getLicenseWorkspaceAccess(supabase, user, licenseRequestId);
    if (!access || access.role !== "creator") {
      throw new ApiHttpError(403, "forbidden", "Only the creator can publish brand shares.");
    }

    const { data: delivery } = await supabase
      .from("license_deliveries")
      .select("id")
      .eq("license_request_id", licenseRequestId)
      .eq("vault_asset_id", assetId)
      .maybeSingle();

    if (!delivery) {
      throw new ApiHttpError(404, "not_found", "This asset has not been delivered for this licence.");
    }

    const { data: asset, error: assetErr } = await supabase
      .from("vault_assets")
      .select("id, user_id, file_path, encryption_key_id, share_file_path, asset_type")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (assetErr || !asset) {
      throw new ApiHttpError(404, "not_found", "Asset not found.");
    }

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");

    if (!(file instanceof File) || file.size === 0) {
      throw new ApiHttpError(400, "invalid_input", "Provide a file.");
    }

    const mimeType = file.type || "image/png";
    if (!mimeType.startsWith("image/")) {
      throw new ApiHttpError(400, "invalid_input", "Brand share must be an image.");
    }

    const admin = createServiceRoleClient();
    const storageClient = admin ?? supabase;
    const dbClient = admin ?? supabase;

    const sharePath = await saveBrandShareUpload(
      storageClient,
      dbClient,
      asset,
      licenseRequestId,
      file,
      mimeType
    );

    return Response.json({ ok: true, data: { share_file_path: sharePath } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
