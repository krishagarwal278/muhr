import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { MIN_CHARACTER_PHOTOS } from "@/lib/profile/completion";

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
    .select("id, file_name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("character_photos GET:", error);
    return NextResponse.json({ error: "Failed to load photos" }, { status: 500 });
  }

  return NextResponse.json({
    photos: data ?? [],
    count: data?.length ?? 0,
    minRequired: MIN_CHARACTER_PHOTOS,
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

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const uploaded: { id: string; file_name: string }[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Each photo must be under 15MB." }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${user.id}/character-photos/${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from("assets").upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      console.error("character photo upload:", uploadError);
      return NextResponse.json({ error: "Upload failed." }, { status: 500 });
    }

    const { data: row, error: dbError } = await supabase
      .from("character_photos")
      .insert({
        user_id: user.id,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select("id, file_name")
      .single();

    if (dbError || !row) {
      console.error("character photo insert:", dbError);
      return NextResponse.json({ error: "Failed to save photo record." }, { status: 500 });
    }
    uploaded.push(row);
  }

  const { count: newCount } = await supabase
    .from("character_photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return NextResponse.json({
    success: true,
    uploaded,
    count: newCount ?? 0,
    minRequired: MIN_CHARACTER_PHOTOS,
  });
}
