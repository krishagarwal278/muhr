import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: assets, error } = await supabase
    .from("vault_assets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }

  // Generate signed URLs for each asset
  const assetsWithUrls = await Promise.all(
    (assets || []).map(async (asset) => {
      const { data: signedUrl } = await supabase.storage
        .from("assets")
        .createSignedUrl(asset.file_path, 3600); // 1 hour expiry

      return {
        ...asset,
        signed_url: signedUrl?.signedUrl || null,
      };
    })
  );

  return NextResponse.json({ assets: assetsWithUrls });
}
