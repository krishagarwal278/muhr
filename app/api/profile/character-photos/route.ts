import crypto from "crypto";

import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { MAX_CHARACTER_PHOTOS, MIN_CHARACTER_PHOTOS } from "@/lib/profile/completion";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data, error } = await supabase
      .from("character_photos")
      .select("id, file_name, file_path, created_at, slot_index")
      .eq("user_id", user.id)
      .order("slot_index", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("character_photos_get_error", { userId: user.id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to load photos" } },
        { status: 500 }
      );
    }

    const photos = await Promise.all(
      (data ?? []).map(async (row) => {
        const { data: signed, error: signError } = await supabase.storage
          .from("assets")
          .createSignedUrl(row.file_path, 3600);
        const signedUrl = signed?.signedUrl ?? null;
        const storageMissing = !signedUrl;

        if (storageMissing) {
          logger.warn("character_photo_missing_in_storage", {
            userId: user.id,
            photoId: row.id,
            filePath: row.file_path,
            signError: signError?.message ?? null,
          });
        }

        return {
          id: row.id,
          file_name: row.file_name,
          created_at: row.created_at,
          slot_index: row.slot_index,
          signed_url: signedUrl,
          storage_missing: storageMissing,
        };
      })
    );

    return Response.json({
      ok: true,
      data: {
        photos,
        count: photos.length,
        minRequired: MIN_CHARACTER_PHOTOS,
        maxAllowed: MAX_CHARACTER_PHOTOS,
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { count } = await supabase
      .from("character_photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= 30) {
      return Response.json(
        { ok: false, error: { code: "limit_reached", message: "Maximum 30 character photos allowed." } },
        { status: 400 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid form data" } },
        { status: 400 }
      );
    }

    const fromFiles = formData.getAll("files").filter((f): f is File => f instanceof File);
    const fromFile = formData.getAll("file").filter((f): f is File => f instanceof File);
    const files = [...fromFiles, ...fromFile];
    if (files.length === 0) {
      return Response.json(
        { ok: false, error: { code: "missing_files", message: "No files provided" } },
        { status: 400 }
      );
    }

    const slotRaw = formData.get("slot_index");
    const requestedSlot =
      slotRaw != null && slotRaw !== ""
        ? parseInt(String(slotRaw), 10)
        : null;

    if (
      requestedSlot != null &&
      (!Number.isInteger(requestedSlot) || requestedSlot < 0 || requestedSlot >= MAX_CHARACTER_PHOTOS)
    ) {
      return Response.json(
        { ok: false, error: { code: "invalid_slot", message: "Invalid slot" } },
        { status: 400 }
      );
    }

    const { data: existingRows } = await supabase
      .from("character_photos")
      .select("slot_index")
      .eq("user_id", user.id);

    const occupied = new Set(
      (existingRows ?? [])
        .map((r) => r.slot_index)
        .filter((s): s is number => s != null && s >= 0 && s < MAX_CHARACTER_PHOTOS)
    );

    const freeSlots = Array.from({ length: MAX_CHARACTER_PHOTOS }, (_, i) => i).filter((i) => !occupied.has(i));

    if (freeSlots.length === 0) {
      return Response.json(
        { ok: false, error: { code: "limit_reached", message: `Maximum ${MAX_CHARACTER_PHOTOS} character photos allowed.` } },
        { status: 400 }
      );
    }

    let slotAssignments: number[];
    if (requestedSlot != null) {
      if (occupied.has(requestedSlot)) {
        return Response.json(
          { ok: false, error: { code: "slot_occupied", message: "This slot already has a photo" } },
          { status: 400 }
        );
      }
      if (files.length > 1) {
        return Response.json(
          { ok: false, error: { code: "invalid_input", message: "Upload one photo at a time for a slot" } },
          { status: 400 }
        );
      }
      slotAssignments = [requestedSlot];
    } else {
      slotAssignments = freeSlots.slice(0, files.length);
      if (files.length > slotAssignments.length) {
        return Response.json(
          { ok: false, error: { code: "limit_reached", message: `Only ${slotAssignments.length} slot${slotAssignments.length !== 1 ? "s" : ""} available.` } },
          { status: 400 }
        );
      }
    }

    const batch = files.slice(0, slotAssignments.length);
    const uploaded: { id: string; file_name: string; slot_index: number }[] = [];
    const failed: { file_name: string; error: string }[] = [];

    for (let i = 0; i < batch.length; i++) {
      const file = batch[i];
      const slotIndex = slotAssignments[i];
      const mime = file.type || "image/jpeg";
      if (!mime.startsWith("image/")) {
        failed.push({ file_name: file.name, error: "Not an image file" });
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        failed.push({ file_name: file.name, error: "Over 15MB" });
        continue;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/character-photos/${Date.now()}-${i}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage.from("assets").upload(filePath, buffer, {
        contentType: mime,
        upsert: false,
      });
      if (uploadError) {
        logger.error("character_photo_upload_error", { userId: user.id, code: uploadError.message });
        failed.push({ file_name: file.name, error: "Storage upload failed" });
        continue;
      }

      const { data: row, error: dbError } = await supabase
        .from("character_photos")
        .insert({
          user_id: user.id,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: mime,
          slot_index: slotIndex,
        })
        .select("id, file_name, slot_index")
        .single();

      if (dbError || !row) {
        logger.error("character_photo_insert_error", { userId: user.id, code: dbError?.code });
        failed.push({ file_name: file.name, error: "Could not save record" });
        await supabase.storage.from("assets").remove([filePath]);
        continue;
      }
      uploaded.push({ id: row.id, file_name: row.file_name, slot_index: row.slot_index });
    }

    if (uploaded.length === 0) {
      return Response.json(
        { ok: false, error: { code: "upload_failed", message: failed[0]?.error ?? "Upload failed" }, failed },
        { status: 400 }
      );
    }

    const { count: newCount } = await supabase
      .from("character_photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    return Response.json({
      ok: true,
      data: {
        uploaded,
        failed: failed.length > 0 ? failed : undefined,
        count: newCount ?? 0,
        minRequired: MIN_CHARACTER_PHOTOS,
        maxAllowed: MAX_CHARACTER_PHOTOS,
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
