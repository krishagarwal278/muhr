import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeHandle, validateHandle } from "@/lib/profile/handle";
import { muidFromUserId } from "@/lib/profile/muid";

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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("handle, display_name, accepting_requests, licensing_notes")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("profile GET:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  return NextResponse.json({
    handle: profile?.handle ?? null,
    displayName: profile?.display_name ?? null,
    acceptingRequests: profile?.accepting_requests ?? true,
    licensingNotes: typeof profile?.licensing_notes === "string" ? profile.licensing_notes : "",
    muid: muidFromUserId(user.id),
    email: user.email ?? null,
  });
}

export async function PATCH(request: Request) {
  const supabase = await supabaseFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: {
    handle?: string | null;
    display_name?: string;
    accepting_requests?: boolean;
    licensing_notes?: string | null;
  } = {};

  if ("handle" in body) {
    const raw = body.handle;
    if (raw === null || raw === "") {
      updates.handle = null;
    } else if (typeof raw === "string") {
      const err = validateHandle(raw);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      updates.handle = normalizeHandle(raw);
    } else {
      return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
    }
  }

  if ("displayName" in body) {
    const v = body.displayName;
    if (v === null || v === "") updates.display_name = "";
    else if (typeof v === "string") {
      const t = v.trim().slice(0, 120);
      updates.display_name = t;
    } else return NextResponse.json({ error: "Invalid displayName" }, { status: 400 });
  }

  if ("acceptingRequests" in body) {
    if (typeof body.acceptingRequests !== "boolean") {
      return NextResponse.json({ error: "acceptingRequests must be boolean" }, { status: 400 });
    }
    updates.accepting_requests = body.acceptingRequests;
  }

  if ("licensingNotes" in body) {
    const v = body.licensingNotes;
    if (v === null || v === "") {
      updates.licensing_notes = null;
    } else if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 4000) {
        return NextResponse.json({ error: "Licensing notes must be at most 4000 characters" }, { status: 400 });
      }
      updates.licensing_notes = t.length ? t : null;
    } else {
      return NextResponse.json({ error: "Invalid licensingNotes" }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("handle, display_name, accepting_requests, licensing_notes")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
    }
    console.error("profile PATCH:", error);
    return NextResponse.json({ error: "Could not save profile" }, { status: 500 });
  }

  return NextResponse.json({
    handle: data?.handle ?? null,
    displayName: data?.display_name ?? null,
    acceptingRequests: data?.accepting_requests ?? true,
    licensingNotes: typeof data?.licensing_notes === "string" ? data.licensing_notes : "",
    muid: muidFromUserId(user.id),
  });
}
