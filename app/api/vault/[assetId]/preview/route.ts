import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isPlainImageBuffer, mimeFromImageBuffer } from "@/lib/vault/plainImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stream a face photo for archive/vault preview (never returns encrypted ciphertext). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const { assetId } = await params;
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data: asset, error } = await supabase
      .from("vault_assets")
      .select("id,asset_type,file_path,mime_type,encryption_key_id,original_mime_type")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !asset) {
      return new Response("Not found", { status: 404 });
    }

    if (asset.asset_type !== "face_photo") {
      return new Response("Not a photo", { status: 400 });
    }

    if (asset.encryption_key_id) {
      return new Response("Encrypted — cannot preview without migration", { status: 415 });
    }

    const admin = createServiceRoleClient();
    const storageClient = admin ?? supabase;
    const { data: blob, error: downloadErr } = await storageClient.storage
      .from("assets")
      .download(asset.file_path);

    if (downloadErr || !blob) {
      return new Response("Could not load file", { status: 404 });
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    if (!isPlainImageBuffer(buffer)) {
      return new Response("Not an image", { status: 415 });
    }

    const mime = mimeFromImageBuffer(buffer, asset.mime_type);
    return new Response(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const { status, message } = toApiError(err);
    return new Response(message, { status });
  }
}
