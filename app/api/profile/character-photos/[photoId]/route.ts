import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

async function getOwnedPhoto(supabase: Awaited<ReturnType<typeof supabaseFromCookies>>, userId: string, photoId: string) {
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
  const { photoId } = await params;
  const supabase = await supabaseFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const photo = await getOwnedPhoto(supabase, user.id, photoId);
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  await supabase.storage.from("assets").remove([photo.file_path]);

  const { error: dbError } = await supabase.from("character_photos").delete().eq("id", photoId).eq("user_id", user.id);
  if (dbError) {
    console.error("character photo DELETE:", dbError);
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 });
  }

  const { count } = await supabase
    .from("character_photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return NextResponse.json({ success: true, count: count ?? 0 });
}
