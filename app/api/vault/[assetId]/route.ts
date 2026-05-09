import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
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

  const { data: asset, error } = await supabase
    .from("vault_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ asset });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
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

  // Verify ownership and fetch file_path for storage deletion.
  const { data: asset, error: fetchErr } = await supabase
    .from("vault_assets")
    .select("id,file_path")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete the storage object. Use service role if configured (storage delete often requires elevated policy).
  const admin = createServiceRoleClient();
  const storageClient = admin ?? supabase;

  const { error: storageErr } = await storageClient.storage.from("assets").remove([asset.file_path]);
  if (storageErr) {
    console.error("Storage remove error:", storageErr);
    // Continue anyway: user experience should still remove DB row; orphaned objects can be GC'd later.
  }

  const { error: delErr } = await supabase
    .from("vault_assets")
    .delete()
    .eq("id", assetId)
    .eq("user_id", user.id);

  if (delErr) {
    console.error("DB delete error:", delErr);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
