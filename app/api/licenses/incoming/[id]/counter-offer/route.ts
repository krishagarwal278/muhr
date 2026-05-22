import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { parseCounterOfferPayload } from "@/lib/license/counterOffer";

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

/**
 * POST /api/licenses/incoming/[id]/counter-offer
 * Creators submit a counter-offer with revised terms (channels, territories, duration, budget).
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await ctx.params;
  const supabase = await supabaseFromCookies();
  const user = await getRouteHandlerUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseCounterOfferPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { channels, territories, durationDays, proposedBudgetInr, note } = parsed.payload;

  const { data: licenseReq, error: fetchErr } = await supabase
    .from("license_requests")
    .select("id, creator_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[counter-offer] license_requests fetch failed", {
      requestId,
      userId: user.id,
      code: fetchErr.code,
      message: fetchErr.message,
    });
    return NextResponse.json(
      { error: "We couldn't load this license request right now." },
      { status: 500 }
    );
  }

  if (!licenseReq) {
    return NextResponse.json({ error: "License request not found." }, { status: 404 });
  }

  if (licenseReq.creator_id !== user.id) {
    return NextResponse.json(
      { error: "You can only create counter-offers for your own license requests." },
      { status: 403 }
    );
  }

  if (licenseReq.status !== "pending") {
    return NextResponse.json(
      {
        error:
          "Counter-offers can only be created for pending requests. This request has already been accepted, declined, or withdrawn.",
      },
      { status: 400 }
    );
  }

  const { count: pendingCount, error: pendingErr } = await supabase
    .from("license_counter_offers")
    .select("id", { count: "exact", head: true })
    .eq("license_request_id", requestId)
    .eq("status", "pending");

  if (pendingErr) {
    const missingTable =
      pendingErr.code === "42P01" ||
      pendingErr.message?.includes("license_counter_offers");
    console.error("[counter-offer] pending check failed", {
      requestId,
      code: pendingErr.code,
      message: pendingErr.message,
    });
    return NextResponse.json(
      {
        error: missingTable
          ? "Counter-offers are not available yet. Please try again later."
          : "We couldn't submit your counter-offer right now.",
      },
      { status: missingTable ? 503 : 500 }
    );
  }

  if ((pendingCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "You already have a pending counter-offer on this request. Wait for the brand to respond, or ask them to decline it before sending another.",
      },
      { status: 409 }
    );
  }

  const { data: counterOffer, error: insertErr } = await supabase
    .from("license_counter_offers")
    .insert({
      license_request_id: requestId,
      channels,
      territories,
      duration_days: durationDays,
      proposed_budget_inr: proposedBudgetInr,
      note: note.length > 0 ? note : null,
      status: "pending",
      created_by_user_id: user.id,
    })
    .select("*")
    .single();

  if (insertErr) {
    console.error("[counter-offer] insert failed", {
      requestId,
      userId: user.id,
      code: insertErr.code,
      message: insertErr.message,
    });
    return NextResponse.json(
      { error: "We couldn't save your counter-offer right now. Please try again in a moment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ counterOffer }, { status: 201 });
}
