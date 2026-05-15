import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
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

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: allRows, error: lrError } = await supabase
    .from("license_requests")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (lrError) {
    console.error("license_requests fetch:", lrError);
  }

  const rows = lrError ? [] : allRows ?? [];
  const incomingRequests = rows.filter((r) => r.status === "pending");
  const respondedRequests = rows
    .filter((r) => r.status === "accepted" || r.status === "declined")
    .sort((a, b) => {
      const ta = new Date(a.responded_at ?? a.created_at).getTime();
      const tb = new Date(b.responded_at ?? b.created_at).getTime();
      return tb - ta;
    });

  const withdrawnRequests = rows
    .filter((r) => r.status === "withdrawn")
    .sort((a, b) => {
      const ta = new Date(a.cancelled_at ?? a.created_at).getTime();
      const tb = new Date(b.cancelled_at ?? b.created_at).getTime();
      return tb - ta;
    });

  const acceptedCount = rows.filter((r) => r.status === "accepted").length;
  const declinedCount = rows.filter((r) => r.status === "declined").length;
  const withdrawnCount = rows.filter((r) => r.status === "withdrawn").length;
  const pendingCount = incomingRequests.length;

  return NextResponse.json({
    active: [],
    pending: [],
    expired: [],
    incomingRequests,
    respondedRequests,
    withdrawnRequests,
    counts: {
      pending: pendingCount,
      accepted: acceptedCount,
      declined: declinedCount,
      withdrawn: withdrawnCount,
    },
  });
}

export async function POST(request: Request) {
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

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const licenseRequest = await request.json();

  // TODO: Create license request
  // TODO: Notify creator
  // TODO: Check against consent rules

  return NextResponse.json({
    success: true,
    message: "License request created",
    request: licenseRequest,
  });
}
