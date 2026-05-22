import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { normalizeHandle, validateHandle } from "@/lib/profile/handle";
import { muidFromUserId } from "@/lib/profile/muid";

type ProfileRow = {
  handle: string | null;
  display_name: string | null;
  accepting_requests: boolean | null;
  licensing_notes: string | null;
  min_license_fee_inr?: number | null;
  follower_count?: number | null;
};

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  const msg = error.message?.toLowerCase() ?? "";
  return msg.includes("follower_count") || msg.includes("min_license_fee_inr");
}

function profileJsonFromRow(
  profile: ProfileRow | null,
  userId: string,
  email: string | null | undefined
) {
  return {
    handle: profile?.handle ?? null,
    displayName: profile?.display_name ?? null,
    acceptingRequests: profile?.accepting_requests ?? true,
    licensingNotes: typeof profile?.licensing_notes === "string" ? profile.licensing_notes : "",
    minLicenseFeeInr:
      typeof profile?.min_license_fee_inr === "number" && profile.min_license_fee_inr > 0
        ? profile.min_license_fee_inr
        : null,
    followerCount:
      typeof profile?.follower_count === "number" && profile.follower_count > 0
        ? profile.follower_count
        : null,
    muid: muidFromUserId(userId),
    email: email ?? null,
  };
}

async function loadProfileRow(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: ProfileRow | null; error: { code?: string; message?: string } | null }> {
  const full = await supabase
    .from("profiles")
    .select(
      "handle, display_name, accepting_requests, licensing_notes, min_license_fee_inr, follower_count"
    )
    .eq("id", userId)
    .maybeSingle();

  if (!full.error) {
    return { data: full.data as ProfileRow | null, error: null };
  }
  if (!isMissingColumnError(full.error)) {
    return { data: null, error: full.error };
  }

  const fallback = await supabase
    .from("profiles")
    .select("handle, display_name, accepting_requests, licensing_notes")
    .eq("id", userId)
    .maybeSingle();

  return {
    data: fallback.data as ProfileRow | null,
    error: fallback.error,
  };
}

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
  const user = await getRouteHandlerUser(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error } = await loadProfileRow(supabase, user.id);

  if (error) {
    console.error("[profile GET] failed", { userId: user.id, code: error.code, message: error.message });
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  return NextResponse.json(profileJsonFromRow(profile, user.id, user.email));
}

export async function PATCH(request: Request) {
  const supabase = await supabaseFromCookies();
  const user = await getRouteHandlerUser(supabase);
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
    follower_count?: number | null;
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

  if ("followerCount" in body) {
    const v = body.followerCount;
    if (v === null || v === "") {
      updates.follower_count = null;
    } else if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      updates.follower_count = Math.min(Math.round(v), 500_000_000);
    } else {
      return NextResponse.json({ error: "followerCount must be a positive number" }, { status: 400 });
    }
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
    .select(
      "handle, display_name, accepting_requests, licensing_notes, min_license_fee_inr, follower_count"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
    }
    if (isMissingColumnError(error) && "follower_count" in updates) {
      console.error("[profile PATCH] follower_count column missing", {
        userId: user.id,
        code: error.code,
      });
      return NextResponse.json(
        { error: "Follower count cannot be saved until the latest database migration is applied." },
        { status: 503 }
      );
    }
    console.error("[profile PATCH] failed", { userId: user.id, code: error.code, message: error.message });
    return NextResponse.json({ error: "Could not save profile" }, { status: 500 });
  }

  return NextResponse.json(profileJsonFromRow(data as ProfileRow | null, user.id, user.email));
}
