import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import {
  AVATAR_MIGRATION_HINT,
  isAvatarColumnMissing,
  isProfileAvatarMime,
  loadAvatarPath,
  profileAvatarStoragePath,
  PROFILE_AVATAR_MAX_BYTES,
  signedProfileAvatarUrl,
} from "@/lib/profile/avatar";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid form data" } },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json(
        { ok: false, error: { code: "missing_file", message: "No image provided" } },
        { status: 400 }
      );
    }

    const mime = file.type || "image/jpeg";
    if (!isProfileAvatarMime(mime)) {
      return Response.json(
        { ok: false, error: { code: "invalid_type", message: "Use JPEG, PNG, or WebP" } },
        { status: 400 }
      );
    }
    if (file.size > PROFILE_AVATAR_MAX_BYTES) {
      return Response.json(
        { ok: false, error: { code: "file_too_large", message: "Image must be 5MB or smaller" } },
        { status: 400 }
      );
    }

    const oldPath = await loadAvatarPath(supabase, user.id);
    const filePath = profileAvatarStoragePath(user.id, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from("assets").upload(filePath, buffer, {
      contentType: mime,
      upsert: false,
    });
    if (uploadError) {
      logger.error("profile_avatar_upload_error", { userId: user.id, message: uploadError.message });
      return Response.json(
        { ok: false, error: { code: "upload_failed", message: "Could not upload image" } },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_path: filePath })
      .eq("id", user.id);

    if (updateError) {
      await supabase.storage.from("assets").remove([filePath]);
      logger.error("profile_avatar_update_error", {
        userId: user.id,
        code: updateError.code,
        message: updateError.message,
      });
      if (isAvatarColumnMissing(updateError)) {
        return Response.json(
          { ok: false, error: { code: "migration_required", message: AVATAR_MIGRATION_HINT } },
          { status: 503 }
        );
      }
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Could not save profile photo" } },
        { status: 500 }
      );
    }

    if (oldPath && oldPath !== filePath) {
      await supabase.storage.from("assets").remove([oldPath]);
    }

    const avatarUrl = await signedProfileAvatarUrl(supabase, filePath);
    return Response.json({ ok: true, data: { avatarUrl } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const oldPath = await loadAvatarPath(supabase, user.id);
    if (oldPath) {
      await supabase.storage.from("assets").remove([oldPath]);
    }

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_path: null })
      .eq("id", user.id);

    if (error) {
      logger.error("profile_avatar_delete_error", {
        userId: user.id,
        code: error.code,
        message: error.message,
      });
      if (isAvatarColumnMissing(error)) {
        return Response.json(
          { ok: false, error: { code: "migration_required", message: AVATAR_MIGRATION_HINT } },
          { status: 503 }
        );
      }
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Could not remove profile photo" } },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, data: { avatarUrl: null } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
