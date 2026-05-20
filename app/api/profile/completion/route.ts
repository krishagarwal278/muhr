import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { fetchProfileCompletionForUser } from "@/lib/profile/completionServer";

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

  try {
    const { items, percent } = await fetchProfileCompletionForUser(supabase, user.id);
    return NextResponse.json({ percent, items });
  } catch (err) {
    console.error("profile completion GET:", err);
    return NextResponse.json({ error: "Failed to load profile completion" }, { status: 500 });
  }
}
