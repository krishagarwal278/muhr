import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";

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
 * GET /api/licenses/requests/[id]/counter-offers
 * Lists counter-offers for a license request (creator or brand on the request only).
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await ctx.params;
  const supabase = await supabaseFromCookies();
  const user = await getRouteHandlerUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getLicenseWorkspaceAccess(supabase, user, requestId);
  if (!access) {
    return NextResponse.json({ error: "License request not found." }, { status: 404 });
  }

  const { data: counterOffers, error } = await supabase
    .from("license_counter_offers")
    .select("*")
    .eq("license_request_id", requestId)
    .order("created_at", { ascending: false });

  if (error) {
    const missingTable =
      error.code === "42P01" || error.message?.includes("license_counter_offers");
    console.error("[counter-offers list] select failed", {
      requestId,
      userId: user.id,
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      {
        error: missingTable
          ? "Counter-offers are not available yet."
          : "We couldn't load counter-offers right now.",
        counterOffers: [],
      },
      { status: missingTable ? 503 : 500 }
    );
  }

  return NextResponse.json({ counterOffers: counterOffers ?? [] });
}
