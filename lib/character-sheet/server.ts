import type { SupabaseClient } from "@supabase/supabase-js";

import {
  hasAllMeasurements,
  MIN_CHARACTER_PHOTOS,
} from "@/lib/profile/completion";
import { tryFalCharacterSheet } from "./falGenerate";
import type {
  CharacterSheetGenerateResponse,
  CharacterSheetStats,
  CharacterSheetStatus,
  CharacterSheetStatusResponse,
} from "./types";

function statsFromProfile(row: Record<string, unknown>): CharacterSheetStats {
  return {
    height: String(row.height ?? ""),
    weight: String(row.weight ?? ""),
    chest: String(row.chest ?? ""),
    waist: String(row.waist ?? ""),
    hips: String(row.hips ?? ""),
    shoeSize: String(row.shoe_size ?? ""),
  };
}

export async function fetchCharacterSheetStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<CharacterSheetStatusResponse> {
  const [profileRes, photosRes, sheetRes, vaultRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("height, weight, chest, waist, hips, shoe_size, full_name, handle")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("character_photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("character_sheets")
      .select("status, vault_asset_id, generation_mode, error_message")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("vault_assets")
      .select("id")
      .eq("user_id", userId)
      .eq("asset_type", "character_sheet")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  const photoCount = photosRes.count ?? 0;
  const hasMeasurements = profile ? hasAllMeasurements(profile) : false;
  const eligible = photoCount >= MIN_CHARACTER_PHOTOS && hasMeasurements;

  const vaultAssetId = sheetRes.data?.vault_asset_id ?? vaultRes.data?.id ?? null;
  const sealed = !!vaultAssetId;

  let status: CharacterSheetStatus = "locked";
  if (sealed) status = "sealed";
  else if (sheetRes.data?.status === "generating") status = "generating";
  else if (sheetRes.data?.status === "failed") status = "failed";
  else if (eligible) status = "ready";

  return {
    status,
    eligible,
    photoCount,
    minPhotos: MIN_CHARACTER_PHOTOS,
    hasMeasurements,
    vaultAssetId,
    stats: hasMeasurements && profile ? statsFromProfile(profile) : null,
    generationMode:
      (sheetRes.data?.generation_mode as CharacterSheetStatusResponse["generationMode"]) ?? null,
    errorMessage: sheetRes.data?.error_message ?? null,
  };
}

export async function generateCharacterSheet(
  supabase: SupabaseClient,
  userId: string,
  options?: { regenerate?: boolean }
): Promise<{ ok: true; data: CharacterSheetGenerateResponse } | { ok: false; error: string }> {
  const status = await fetchCharacterSheetStatus(supabase, userId);
  if (status.status === "sealed" && !options?.regenerate) {
    return { ok: false, error: "Your character sheet is already sealed in the Vault." };
  }
  if (!status.eligible || !status.stats) {
    return {
      ok: false,
      error: `Upload ${status.minPhotos}+ character photos and save all measurements in Settings first.`,
    };
  }

  const { data: photos } = await supabase
    .from("character_photos")
    .select("id, file_path")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(7);

  if (!photos?.length) {
    return { ok: false, error: "No character photos found." };
  }

  const signedPhotos = await Promise.all(
    photos.map(async (p) => {
      const { data } = await supabase.storage.from("assets").createSignedUrl(p.file_path, 60 * 10);
      return { id: p.id, signedUrl: data?.signedUrl ?? "" };
    })
  );

  const validPhotos = signedPhotos.filter((p) => p.signedUrl);
  if (validPhotos.length === 0) {
    return { ok: false, error: "Could not access character photos." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, handle")
    .eq("id", userId)
    .maybeSingle();

  const displayName =
    (typeof profile?.full_name === "string" && profile.full_name.trim()) ||
    (typeof profile?.handle === "string" && profile.handle.trim()) ||
    "Creator";

  await supabase.from("character_sheets").upsert(
    {
      user_id: userId,
      status: "generating",
      error_message: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  let mode: "ai" | "compose" = "compose";
  let imageUrl: string | undefined;

  const aiUrl = await tryFalCharacterSheet({
    referenceImageUrl: validPhotos[0].signedUrl,
    stats: status.stats,
  });

  if (aiUrl) {
    mode = "ai";
    imageUrl = aiUrl;
    await supabase
      .from("character_sheets")
      .update({ status: "ready", generation_mode: mode })
      .eq("user_id", userId);
  } else {
    await supabase
      .from("character_sheets")
      .update({ status: "ready", generation_mode: mode })
      .eq("user_id", userId);
  }

  return {
    ok: true,
    data: {
      mode,
      imageUrl,
      stats: status.stats,
      photos: validPhotos,
      displayName,
    },
  };
}

export async function markCharacterSheetSealed(
  supabase: SupabaseClient,
  userId: string,
  vaultAssetId: string,
  generationMode: "ai" | "compose"
) {
  await supabase.from("character_sheets").upsert(
    {
      user_id: userId,
      status: "sealed",
      vault_asset_id: vaultAssetId,
      generation_mode: generationMode,
      sealed_at: new Date().toISOString(),
      error_message: null,
    },
    { onConflict: "user_id" }
  );
}
