import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

import { markCharacterSheetSealed } from "@/lib/character-sheet/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

const schema = z.object({
  vaultAssetId: z.string().uuid(),
  generationMode: z.enum(["ai", "compose"]),
  replaceVaultAssetId: z.string().uuid().optional(),
});

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

export async function POST(request: Request) {
  const supabase = await supabaseFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: asset } = await supabase
    .from("vault_assets")
    .select("id, asset_type")
    .eq("id", parsed.data.vaultAssetId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!asset || asset.asset_type !== "character_sheet") {
    return NextResponse.json({ error: "Character sheet asset not found" }, { status: 404 });
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

  return NextResponse.json({ success: true });
}
