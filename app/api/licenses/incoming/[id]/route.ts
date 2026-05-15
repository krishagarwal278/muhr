import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { resolveLicenseRequestAccess } from "@/lib/license/workspaceAccess";
import type { LicenseRequestRow } from "@/types/license";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row, error } = await supabase
    .from("license_requests")
    .select("*")
    .eq("id", id)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("license_requests get:", error);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = resolveLicenseRequestAccess(user, row as LicenseRequestRow);
  if (role !== "creator") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ request: row });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; decline_reason?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "accept" && body.action !== "decline") {
    return NextResponse.json({ error: "action must be accept or decline" }, { status: 400 });
  }

  const declineReason =
    typeof body.decline_reason === "string" ? body.decline_reason.trim().slice(0, 500) : null;

  if (body.action === "decline" && declineReason === "") {
    return NextResponse.json({ error: "decline_reason optional but cannot be empty string" }, { status: 400 });
  }

  const updates =
    body.action === "accept"
      ? {
          status: "accepted" as const,
          responded_at: new Date().toISOString(),
          decline_reason: null,
        }
      : {
          status: "declined" as const,
          responded_at: new Date().toISOString(),
          decline_reason: declineReason,
        };

  const { data, error } = await supabase
    .from("license_requests")
    .update(updates)
    .eq("id", id)
    .eq("creator_id", user.id)
    .eq("status", "pending")
    .select("id, status")
    .maybeSingle();

  if (error) {
    console.error("license request update:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Request not found or already handled" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id: data.id, status: data.status });
}
