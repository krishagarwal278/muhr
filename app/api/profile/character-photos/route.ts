import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { MAX_CHARACTER_PHOTOS, MIN_CHARACTER_PHOTOS } from "@/lib/profile/completion";

async function supabaseFromCookies() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore
          }
        },
      },
    }
  );
}

export async function GET() {
  const supabase = await supabaseFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("character_photos")
    .select("id, file_name, file_path, created_at, slot_index")
    .eq("user_id", user.id)
    .order("slot_index", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("character_photos GET:", error);
    return NextResponse.json({ error: "Failed to load photos" }, { status: 500 });
  }

  const photos = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage
        .from("assets")
        .createSignedUrl(row.file_path, 3600);
      return {
        id: row.id,
        file_name: row.file_name,
        created_at: row.created_at,
        slot_index: row.slot_index,
        signed_url: signed?.signedUrl ?? null,
      };
    })
  );

  return NextResponse.json({
    photos,
    count: photos.length,
    minRequired: MIN_CHARACTER_PHOTOS,
    maxAllowed: MAX_CHARACTER_PHOTOS,
  });
}

export async function POST(request: Request) {
  const supabase = await supabaseFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count } = await supabase
    .from("character_photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= 30) {
    return NextResponse.json({ error: "Maximum 30 character photos allowed." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const fromFiles = formData.getAll("files").filter((f): f is File => f instanceof File);
  const fromFile = formData.getAll("file").filter((f): f is File => f instanceof File);
  const files = [...fromFiles, ...fromFile];
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
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
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
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
    return NextResponse.json(
      { error: `Maximum ${MAX_CHARACTER_PHOTOS} character photos allowed.` },
      { status: 400 }
    );
  }

  let slotAssignments: number[];
  if (requestedSlot != null) {
    if (occupied.has(requestedSlot)) {
      return NextResponse.json({ error: "This slot already has a photo" }, { status: 400 });
    }
    if (files.length > 1) {
      return NextResponse.json({ error: "Upload one photo at a time for a slot" }, { status: 400 });
    }
    slotAssignments = [requestedSlot];
  } else {
    slotAssignments = freeSlots.slice(0, files.length);
    if (files.length > slotAssignments.length) {
      return NextResponse.json(
        { error: `Only ${slotAssignments.length} slot${slotAssignments.length !== 1 ? "s" : ""} available.` },
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
      console.error("character photo upload:", uploadError);
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
      console.error("character photo insert:", dbError);
      failed.push({ file_name: file.name, error: "Could not save record" });
      await supabase.storage.from("assets").remove([filePath]);
      continue;
    }
    uploaded.push({ id: row.id, file_name: row.file_name, slot_index: row.slot_index });
  }

  if (uploaded.length === 0) {
    return NextResponse.json(
      { error: failed[0]?.error ?? "Upload failed", failed },
      { status: 400 }
    );
  }

  const { count: newCount } = await supabase
    .from("character_photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return NextResponse.json({
    success: true,
    uploaded,
    failed: failed.length > 0 ? failed : undefined,
    count: newCount ?? 0,
    minRequired: MIN_CHARACTER_PHOTOS,
    maxAllowed: MAX_CHARACTER_PHOTOS,
  });
}
