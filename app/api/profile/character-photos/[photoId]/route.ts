import type { SupabaseClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOwnedPhoto(supabase: SupabaseClient, userId: string, photoId: string) {
  const { data, error } = await supabase
    .from("character_photos")
    .select("id, file_path, file_name")
    .eq("id", photoId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params;
    const user = await requireUser();
    const supabase = await createRouteClient();

    const photo = await getOwnedPhoto(supabase, user.id, photoId);
    if (!photo) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Photo not found" } },
        { status: 404 }
      );
    }

    await supabase.storage.from("assets").remove([photo.file_path]);

    const { error: dbError } = await supabase
      .from("character_photos")
      .delete()
      .eq("id", photoId)
      .eq("user_id", user.id);

    if (dbError) {
      logger.error("character_photo_delete_error", { userId: user.id, photoId, code: dbError.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to delete photo" } },
        { status: 500 }
      );
    }

    const { count } = await supabase
      .from("character_photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    return Response.json({ ok: true, data: { count: count ?? 0 } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
