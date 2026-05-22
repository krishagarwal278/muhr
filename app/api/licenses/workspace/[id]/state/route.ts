import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { canSignContract, getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { LicenseRequestRow } from "@/types/license";

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
            // ignore
          }
        },
      },
    }
  );
}

async function applyEffectiveIfComplete(admin: NonNullable<ReturnType<typeof createServiceRoleClient>>, id: string) {
  const { data: row } = await admin.from("license_requests").select("*").eq("id", id).maybeSingle();
  if (!row) return;
  const r = row as LicenseRequestRow;
  if (
    r.brand_payment_cleared_at &&
    r.creator_signed_contract_at &&
    r.brand_signed_contract_at &&
    !r.contract_effective_at
  ) {
    await admin
      .from("license_requests")
      .update({ contract_effective_at: new Date().toISOString() })
      .eq("id", id);
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await supabaseFromCookies();
  const user = await getRouteHandlerUser(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getLicenseWorkspaceAccess(supabase, user, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured (service role)" }, { status: 503 });
  }

  let body: {
    action?: string;
    agreed_budget_inr?: number;
    signatory_name?: string;
    side?: "creator" | "brand";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const row = access.row;

  if (body.action === "brand_clear_payment") {
    if (access.role !== "brand") {
      return NextResponse.json({ error: "Only the brand can clear the payment step." }, { status: 403 });
    }
    if (row.status !== "accepted") {
      return NextResponse.json({ error: "Request must be accepted first." }, { status: 400 });
    }
    if (row.brand_payment_cleared_at) {
      return NextResponse.json({ error: "Payment step already recorded." }, { status: 400 });
    }
    const { error } = await admin
      .from("license_requests")
      .update({ brand_payment_cleared_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[workspace state] mark_payment failed", {
        requestId: id,
        code: error.code,
        message: error.message,
      });
      return NextResponse.json(
        { error: "We couldn’t record the payment step right now. Please try again in a moment." },
        { status: 500 }
      );
    }
    await applyEffectiveIfComplete(admin, id);
    const { data: next } = await admin.from("license_requests").select("*").eq("id", id).single();
    return NextResponse.json({ request: next });
  }

  if (body.action === "set_agreed_budget") {
    if (access.role !== "creator") {
      return NextResponse.json({ error: "Only the creator can record the agreed budget." }, { status: 403 });
    }
    if (row.status !== "accepted") {
      return NextResponse.json({ error: "Request must be accepted first." }, { status: 400 });
    }
    const n = typeof body.agreed_budget_inr === "number" ? body.agreed_budget_inr : Number(body.agreed_budget_inr);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) {
      return NextResponse.json({ error: "Invalid agreed_budget_inr" }, { status: 400 });
    }
    const { error } = await admin
      .from("license_requests")
      .update({ agreed_budget_inr: Math.round(n) })
      .eq("id", id)
      .eq("creator_id", user.id);
    if (error) {
      console.error("[workspace state] set_agreed_budget failed", {
        requestId: id,
        code: error.code,
        message: error.message,
      });
      return NextResponse.json(
        { error: "We couldn’t save the agreed budget right now. Please try again in a moment." },
        { status: 500 }
      );
    }
    const { data: next } = await admin.from("license_requests").select("*").eq("id", id).single();
    return NextResponse.json({ request: next });
  }

  if (body.action === "sign") {
    if (row.status !== "accepted") {
      return NextResponse.json({ error: "Request must be accepted before signing." }, { status: 400 });
    }
    if (!canSignContract(row)) {
      return NextResponse.json(
        { error: "Signing is locked until the brand completes the payment step (placeholder)." },
        { status: 400 }
      );
    }
    const name =
      typeof body.signatory_name === "string" ? body.signatory_name.trim().slice(0, 200) : "";
    if (!name) {
      return NextResponse.json({ error: "signatory_name is required." }, { status: 400 });
    }
    const side = body.side;
    if (side !== "creator" && side !== "brand") {
      return NextResponse.json({ error: "side must be creator or brand" }, { status: 400 });
    }
    if (side === "creator" && access.role !== "creator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (side === "brand" && access.role !== "brand") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const now = new Date().toISOString();
    if (side === "creator" && row.creator_signed_contract_at) {
      return NextResponse.json({ error: "Creator has already signed." }, { status: 400 });
    }
    if (side === "brand" && row.brand_signed_contract_at) {
      return NextResponse.json({ error: "Brand has already signed." }, { status: 400 });
    }

    const patch =
      side === "creator"
        ? { creator_signed_contract_at: now, creator_signatory_name: name }
        : { brand_signed_contract_at: now, brand_signatory_name: name };

    const { error } = await admin.from("license_requests").update(patch).eq("id", id);
    if (error) {
      console.error("[workspace state] sign failed", {
        requestId: id,
        side,
        code: error.code,
        message: error.message,
      });
      return NextResponse.json(
        { error: "We couldn’t record your signature right now. Please try again in a moment." },
        { status: 500 }
      );
    }
    await applyEffectiveIfComplete(admin, id);
    const { data: next } = await admin.from("license_requests").select("*").eq("id", id).single();
    return NextResponse.json({ request: next });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
