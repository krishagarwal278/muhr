import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api/jsonResponse";
import { sendLicenseRequestAdminNotification } from "@/lib/email/sendLicenseRequestAdminNotification";
import { resendSendEmail } from "@/lib/email/resendSend";
import { RateLimitError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { getRateLimitIp, rateLimit } from "@/lib/ratelimit";
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

async function notifyCreatorOfLicenseRequest(
  admin: SupabaseClient,
  creatorId: string,
  meta: { brandName: string; brandEmail: string; intendedUse: string }
) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("license_request_creator_notify_skipped", { reason: "no_resend" });
    return;
  }
  const { data, error } = await admin.auth.admin.getUserById(creatorId);
  if (error) {
    logger.warn("license_request_creator_lookup", { message: error.message });
    return;
  }
  const email = data.user?.email;
  if (!email) {
    logger.warn("license_request_creator_notify_skipped", { reason: "no_creator_email" });
    return;
  }
  const subject = `[Muhr] New license request from ${meta.brandName}`;
  const snippet = meta.intendedUse.length > 800 ? `${meta.intendedUse.slice(0, 800)}…` : meta.intendedUse;
  const text = `Hi — ${meta.brandName} (${meta.brandEmail}) submitted a license request on Muhr.

Intended use:
${snippet}

Open Muhr → Licenses to review or message them.`;
  await resendSendEmail(email, subject, text);
}

export async function POST(request: Request) {
  try {
    await rateLimit({
      key: "license_request",
      identifier: getRateLimitIp(request),
      limit: 30,
      window: "1h",
    });

    const admin = createServiceRoleClient();
    if (!admin) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "unavailable",
            message: "Service temporarily unavailable. Please try again later.",
          },
        },
        { status: 503 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid JSON body." } },
        { status: 400 }
      );
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
    const duration_days =
      typeof body.duration_days === "number" ? body.duration_days : Number(body.duration_days);
    const budget_inr =
      body.budget_inr === undefined || body.budget_inr === null || body.budget_inr === ""
        ? null
        : typeof body.budget_inr === "number"
          ? body.budget_inr
          : parseInt(String(body.budget_inr), 10);
    const accept_terms = body.accept_terms === true;

    if (!accept_terms) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "invalid_input",
            message: "You must confirm Muhr terms and privacy policy before submitting.",
          },
        },
        { status: 400 }
      );
    }

    if (!creator_handle || creator_handle.length > 50) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid creator handle." } },
        { status: 400 }
      );
    }
    if (!isEmail(brand_email)) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid brand email." } },
        { status: 400 }
      );
    }
    if (brand_name.length < 2 || brand_name.length > 100) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Name must be 2–100 characters." } },
        { status: 400 }
      );
    }
    if (intended_use.length < 20 || intended_use.length > 2000) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Intended use must be 20–2000 characters." } },
        { status: 400 }
      );
    }
    if (channels.length < 1 || channels.length > 15) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Pick at least one channel." } },
        { status: 400 }
      );
    }
    for (const c of channels) {
      if (!CHANNEL_OPTIONS.includes(c as (typeof CHANNEL_OPTIONS)[number])) {
        return NextResponse.json(
          { ok: false, error: { code: "invalid_input", message: "Invalid channel selection." } },
          { status: 400 }
        );
      }
    }
    if (territories.length < 1 || territories.length > 20) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Pick at least one territory." } },
        { status: 400 }
      );
    }
    for (const t of territories) {
      if (!TERRITORY_OPTIONS.includes(t as (typeof TERRITORY_OPTIONS)[number])) {
        return NextResponse.json(
          { ok: false, error: { code: "invalid_input", message: "Invalid territory selection." } },
          { status: 400 }
        );
      }
    }
    if (!Number.isFinite(duration_days) || duration_days < 1 || duration_days > 365) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid duration." } },
        { status: 400 }
      );
    }
    if (budget_inr !== null && (!Number.isFinite(budget_inr) || budget_inr < 0 || budget_inr > 100_000_000)) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid budget." } },
        { status: 400 }
      );
    }
    if (brand_company && brand_company.length > 100) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Company name too long." } },
        { status: 400 }
      );
    }
    if (brand_website) {
      try {
        new URL(brand_website);
      } catch {
        return NextResponse.json(
          { ok: false, error: { code: "invalid_input", message: "Invalid website URL." } },
          { status: 400 }
        );
      }
      if (brand_website.length > 255) {
        return NextResponse.json(
          { ok: false, error: { code: "invalid_input", message: "Website URL too long." } },
          { status: 400 }
        );
      }
    }

    const handleNorm = creator_handle.trim().toLowerCase();
    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .select("id, accepting_requests, display_name, handle, licensing_notes")
      .eq("handle", handleNorm)
      .maybeSingle();

    if (pErr || !profile) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Creator not found." } },
        { status: 404 }
      );
    }
    if (profile.accepting_requests === false) {
      return NextResponse.json(
        { ok: false, error: { code: "forbidden", message: "This creator is not accepting requests." } },
        { status: 403 }
      );
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
        brand_accepted_muhr_terms: true,
      })
      .select("id, request_token, created_at")
      .single();

    if (insErr || !row) {
      logger.error("license_requests_insert", {
        errCode: insErr?.code,
        message: insErr?.message,
      });
      return NextResponse.json(
        {
          ok: false,
          error: { code: "internal_error", message: "Could not create request. Try again later." },
        },
        { status: 500 }
      );
    }

    const creatorDisplayName =
      (typeof profile.display_name === "string" && profile.display_name.trim()) ||
      (typeof profile.handle === "string" && profile.handle) ||
      creator_handle;
    const creatorLicensingNotes =
      typeof profile.licensing_notes === "string" && profile.licensing_notes.trim()
        ? profile.licensing_notes.trim()
        : null;
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://muhr.app";

    try {
      await sendLicenseRequestAdminNotification(
        {
          requestId: row.id,
          requestToken: row.request_token,
          createdAtIso: row.created_at,
          creatorHandle: handleNorm,
          creatorDisplayName,
          creatorLicensingNotes,
          brandEmail: brand_email,
          brandName: brand_name,
          brandCompany: brand_company,
          brandWebsite: brand_website,
          intendedUse: intended_use,
          channels: [...channels],
          territories: [...territories],
          durationDays: duration_days,
          budgetInr: budget_inr,
        },
        appBaseUrl
      );
    } catch (e) {
      logger.error("license_request_admin_email_failed", {
        message: e instanceof Error ? e.message : String(e),
        requestId: row.id,
      });
    }

    void notifyCreatorOfLicenseRequest(admin, profile.id, {
      brandName: brand_name,
      brandEmail: brand_email,
      intendedUse: intended_use,
    }).catch((e) =>
      logger.error("license_request_creator_email", {
        message: e instanceof Error ? e.message : "unknown",
      })
    );

    return NextResponse.json({
      ok: true,
      success: true,
      request_id: row.id,
      request_token: row.request_token,
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return jsonApiError(err);
    }
    logger.error("license_request_unexpected", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      {
        ok: false,
        error: { code: "internal_error", message: "Something went wrong. Try again later." },
      },
      { status: 500 }
    );
  }
}
