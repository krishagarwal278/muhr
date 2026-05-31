import { BRAND_PROFILE_MIGRATION_HINT } from "@/lib/brand/profile";
import { requireBrandUser } from "@/lib/brand/requireBrandUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const user = await requireBrandUser();
    const { documentId } = await context.params;
    const supabase = await createRouteClient();

    const { data: row, error: loadError } = await supabase
      .from("brand_verification_documents")
      .select("id, file_path")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (loadError) {
      if (loadError.message.includes("brand_verification_documents")) {
        return Response.json(
          {
            ok: false,
            error: { code: "migration_required", message: BRAND_PROFILE_MIGRATION_HINT },
          },
          { status: 503 }
        );
      }
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Could not load document" } },
        { status: 500 }
      );
    }

    if (!row) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Document not found" } },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("brand_verification_documents")
      .delete()
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (deleteError) {
      logger.error("brand_verification_delete_error", { userId: user.id, message: deleteError.message });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Could not remove document" } },
        { status: 500 }
      );
    }

    await supabase.storage.from("assets").remove([row.file_path]);

    return Response.json({ ok: true });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
