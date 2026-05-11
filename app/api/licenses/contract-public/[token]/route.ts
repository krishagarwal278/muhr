import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api/jsonResponse";
import { RateLimitError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { getRateLimitIp, rateLimit } from "@/lib/ratelimit";
import { createServiceRoleClient } from "@/lib/supabase/service";

async function limitContractPublic(request: Request, token: string) {
  const ip = getRateLimitIp(request);
  const id = token.length >= 12 ? token.slice(0, 12) : token;
  await rateLimit({
    key: "contract_public",
    identifier: `${ip}:${id}`,
    limit: 120,
    window: "1m",
  });
}

export async function GET(request: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    if (!token || token.length < 16) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid token." } },
        { status: 400 }
      );
    }

    await limitContractPublic(request, token);

    const admin = createServiceRoleClient();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: { code: "unavailable", message: "Service temporarily unavailable." } },
        { status: 503 }
      );
    }

    const { data: row, error } = await admin
      .from("license_requests")
      .select(
        "id, status, contract_body, intended_use, brand_name, brand_company, duration_days, budget_inr, channels, territories, creator_signed_contract_at, brand_signed_contract_at, creator_signatory_name, brand_signatory_name"
      )
      .eq("request_token", token)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Not found." } },
        { status: 404 }
      );
    }

    if (row.status !== "accepted") {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_state", message: "This request is not active." } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      contract_body: row.contract_body,
      intended_use: row.intended_use,
      brand_name: row.brand_name,
      brand_company: row.brand_company,
      duration_days: row.duration_days,
      budget_inr: row.budget_inr,
      channels: row.channels,
      territories: row.territories,
      creator_signed_contract_at: row.creator_signed_contract_at,
      brand_signed_contract_at: row.brand_signed_contract_at,
      creator_signatory_name: row.creator_signatory_name,
      brand_signatory_name: row.brand_signatory_name,
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return jsonApiError(err);
    }
    logger.error("contract_public_get", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, error: { code: "internal_error", message: "Something went wrong." } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    if (!token || token.length < 16) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid token." } },
        { status: 400 }
      );
    }

    await limitContractPublic(request, token);

    let body: { legal_name?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid JSON body." } },
        { status: 400 }
      );
    }

    const legal = typeof body.legal_name === "string" ? body.legal_name.trim() : "";
    if (legal.length < 2 || legal.length > 200) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "legal_name must be 2–200 characters." } },
        { status: 400 }
      );
    }

    const admin = createServiceRoleClient();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: { code: "unavailable", message: "Service temporarily unavailable." } },
        { status: 503 }
      );
    }

    const { data: row, error: fetchErr } = await admin
      .from("license_requests")
      .select("id, status, brand_signed_contract_at, creator_signed_contract_at")
      .eq("request_token", token)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Not found." } },
        { status: 404 }
      );
    }

    if (row.status !== "accepted") {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_state", message: "This request is not active." } },
        { status: 400 }
      );
    }

    if (row.brand_signed_contract_at) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_state", message: "Already signed." } },
        { status: 400 }
      );
    }

    if (!row.creator_signed_contract_at) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "invalid_state", message: "The creator must sign before you can sign." },
        },
        { status: 400 }
      );
    }

    const { error: updErr } = await admin
      .from("license_requests")
      .update({
        brand_signed_contract_at: new Date().toISOString(),
        brand_signatory_name: legal,
        contract_updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updErr) {
      logger.error("contract_public_brand_sign", { errCode: updErr.code, message: updErr.message });
      return NextResponse.json(
        { ok: false, error: { code: "internal_error", message: "Sign failed. Try again later." } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ok: true });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return jsonApiError(err);
    }
    logger.error("contract_public_post", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, error: { code: "internal_error", message: "Something went wrong." } },
      { status: 500 }
    );
  }
}
