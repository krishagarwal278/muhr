import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

const CHANNEL_OPTIONS = [
  "Instagram",
  "YouTube",
  "TikTok",
  "Facebook",
  "X / Twitter",
  "LinkedIn",
  "Digital Ads",
  "TV / OTT",
  "Print",
] as const;

const TERRITORY_OPTIONS = ["India", "United States", "United Kingdom", "UAE", "Global"] as const;

/** Linear-time shape check (avoids ReDoS from overlapping quantifiers in regex). */
function isEmail(s: string): boolean {
  if (s.length === 0 || s.length > 255) return false;
  const at = s.indexOf("@");
  if (at <= 0) return false;
  if (s.indexOf("@", at + 1) !== -1) return false;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (local.length === 0 || domain.length === 0) return false;
  if (local.includes(" ") || domain.includes(" ") || local.includes("\t") || domain.includes("\t")) return false;
  const lastDot = domain.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === domain.length - 1) return false;
  return true;
}

export async function POST(request: Request) {
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: "License requests require SUPABASE_SERVICE_ROLE_KEY on the server." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const creator_handle = typeof body.creator_handle === "string" ? body.creator_handle.trim() : "";
  const brand_email = typeof body.brand_email === "string" ? body.brand_email.trim() : "";
  const brand_name = typeof body.brand_name === "string" ? body.brand_name.trim() : "";
  const brand_company =
    typeof body.brand_company === "string" ? body.brand_company.trim() || null : null;
  const brand_website =
    typeof body.brand_website === "string" ? body.brand_website.trim() || null : null;
  const intended_use = typeof body.intended_use === "string" ? body.intended_use.trim() : "";
  const channels = Array.isArray(body.channels) ? body.channels.filter((c) => typeof c === "string") : [];
  const territories = Array.isArray(body.territories)
    ? body.territories.filter((c) => typeof c === "string")
    : [];
  const duration_days = typeof body.duration_days === "number" ? body.duration_days : Number(body.duration_days);
  const budget_inr =
    body.budget_inr === undefined || body.budget_inr === null || body.budget_inr === ""
      ? null
      : typeof body.budget_inr === "number"
        ? body.budget_inr
        : parseInt(String(body.budget_inr), 10);

  if (!creator_handle || creator_handle.length > 50) {
    return NextResponse.json({ error: "Invalid creator_handle" }, { status: 400 });
  }
  if (!isEmail(brand_email)) {
    return NextResponse.json({ error: "Invalid brand email" }, { status: 400 });
  }
  if (brand_name.length < 2 || brand_name.length > 100) {
    return NextResponse.json({ error: "Name must be 2–100 characters" }, { status: 400 });
  }
  if (intended_use.length < 20 || intended_use.length > 2000) {
    return NextResponse.json(
      { error: "Intended use must be 20–2000 characters" },
      { status: 400 }
    );
  }
  if (channels.length < 1 || channels.length > 15) {
    return NextResponse.json({ error: "Pick at least one channel" }, { status: 400 });
  }
  for (const c of channels) {
    if (!CHANNEL_OPTIONS.includes(c as (typeof CHANNEL_OPTIONS)[number])) {
      return NextResponse.json({ error: `Invalid channel: ${c}` }, { status: 400 });
    }
  }
  if (territories.length < 1 || territories.length > 20) {
    return NextResponse.json({ error: "Pick at least one territory" }, { status: 400 });
  }
  for (const t of territories) {
    if (!TERRITORY_OPTIONS.includes(t as (typeof TERRITORY_OPTIONS)[number])) {
      return NextResponse.json({ error: `Invalid territory: ${t}` }, { status: 400 });
    }
  }
  if (!Number.isFinite(duration_days) || duration_days < 1 || duration_days > 365) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }
  if (budget_inr !== null && (!Number.isFinite(budget_inr) || budget_inr < 0 || budget_inr > 100_000_000)) {
    return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
  }
  if (brand_company && brand_company.length > 100) {
    return NextResponse.json({ error: "Company name too long" }, { status: 400 });
  }
  if (brand_website) {
    try {
      new URL(brand_website);
    } catch {
      return NextResponse.json({ error: "Invalid website URL" }, { status: 400 });
    }
    if (brand_website.length > 255) {
      return NextResponse.json({ error: "Website URL too long" }, { status: 400 });
    }
  }

  const handleNorm = creator_handle.trim().toLowerCase();
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id, accepting_requests")
    .eq("handle", handleNorm)
    .maybeSingle();

  if (pErr || !profile) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }
  if (profile.accepting_requests === false) {
    return NextResponse.json({ error: "Creator is not accepting requests" }, { status: 403 });
  }

  const { data: row, error: insErr } = await admin
    .from("license_requests")
    .insert({
      creator_id: profile.id,
      brand_email,
      brand_name,
      brand_company,
      brand_website,
      intended_use,
      channels,
      territories,
      duration_days,
      budget_inr,
    })
    .select("id, request_token, created_at")
    .single();

  if (insErr || !row) {
    console.error("license_requests insert:", insErr);
    return NextResponse.json({ error: "Could not create request" }, { status: 500 });
  }

  // TODO: Resend email to creator (non-blocking)
  return NextResponse.json({
    success: true,
    request_id: row.id,
    request_token: row.request_token,
  });
}
