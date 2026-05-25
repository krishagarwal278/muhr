import { z } from "zod";

import { requireUser } from "@/lib/auth/requireUser";
import { markCharacterSheetSealed } from "@/lib/character-sheet/server";
import { toApiError } from "@/lib/errors/apiError";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  vaultAssetId: z.string().uuid(),
  generationMode: z.enum(["ai", "compose"]),
  replaceVaultAssetId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_json", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: { code: "validation_error", message: "Invalid request" } },
        { status: 400 }
      );
    }

    const { data: asset } = await supabase
      .from("vault_assets")
      .select("id, asset_type")
      .eq("id", parsed.data.vaultAssetId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!asset || asset.asset_type !== "character_sheet") {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Character sheet asset not found" } },
        { status: 404 }
      );
    }

    await markCharacterSheetSealed(
      supabase,
      user.id,
      parsed.data.vaultAssetId,
      parsed.data.generationMode
    );

    const replaceId = parsed.data.replaceVaultAssetId;
    if (replaceId && replaceId !== parsed.data.vaultAssetId) {
      const { data: oldAsset } = await supabase
        .from("vault_assets")
        .select("id, file_path")
        .eq("id", replaceId)
        .eq("user_id", user.id)
        .eq("asset_type", "character_sheet")
        .maybeSingle();

      if (oldAsset) {
        const admin = createServiceRoleClient();
        const storageClient = admin ?? supabase;
        await storageClient.storage.from("assets").remove([oldAsset.file_path]);
        await supabase.from("vault_assets").delete().eq("id", replaceId).eq("user_id", user.id);
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
