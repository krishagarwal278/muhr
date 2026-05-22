import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseRequestIds(raw: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (!UUID_RE.test(p)) return [];
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = parseRequestIds(searchParams.get("request_ids"));
  if (ids.length < 1 || ids.length > 24) {
    return NextResponse.json({ error: "Provide 1–24 request_ids (comma-separated UUIDs)." }, { status: 400 });
  }

  const supabase = await supabaseFromCookies();
  const user = await getRouteHandlerUser(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const em = user.email?.trim().toLowerCase();
  if (!em) {
    return NextResponse.json({ error: "Account email required." }, { status: 400 });
  }

  const { data: rows, error: rowErr } = await supabase
    .from("license_requests")
    .select("id, creator_id, brand_email, brand_user_id")
    .in("id", ids);

  if (rowErr) {
    console.error("[merged messages] rows fetch failed", {
      ids,
      code: rowErr.code,
      message: rowErr.message,
    });
    return NextResponse.json(
      { error: "We couldn’t load this thread right now. Please try again in a moment." },
      { status: 500 }
    );
  }

  const list = rows ?? [];
  if (list.length !== ids.length) {
    return NextResponse.json({ error: "One or more requests were not found." }, { status: 404 });
  }

  const creatorIds = new Set(list.map((r) => r.creator_id as string));
  if (creatorIds.size !== 1) {
    return NextResponse.json({ error: "Merged thread is only for one creator." }, { status: 400 });
  }

  const brandEmails = new Set(
    list.map((r) => (typeof r.brand_email === "string" ? r.brand_email.trim().toLowerCase() : ""))
  );
  if (brandEmails.size !== 1 || !brandEmails.has(em)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: messages, error: msgErr } = await supabase
    .from("license_request_messages")
    .select("id, license_request_id, author_role, body, created_at")
    .in("license_request_id", ids)
    .order("created_at", { ascending: true });

  if (msgErr) {
    console.error("[merged messages] messages fetch failed", {
      ids,
      code: msgErr.code,
      message: msgErr.message,
    });
    return NextResponse.json(
      { error: "We couldn’t load this thread right now. Please try again in a moment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ messages: messages ?? [] });
}
