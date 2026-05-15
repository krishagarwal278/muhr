import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { canExchangeLicenseMessages } from "@/lib/license/workspaceMessages";

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

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await supabaseFromCookies();
  const user = await getRouteHandlerUser(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getLicenseWorkspaceAccess(supabase, user, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canExchangeLicenseMessages(access.row.status)) {
    return NextResponse.json({ messages: [], role: access.role });
  }

  const { data, error } = await supabase
    .from("license_request_messages")
    .select("id, author_role, body, created_at")
    .eq("license_request_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("license_request_messages:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [], role: access.role });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await supabaseFromCookies();
  const user = await getRouteHandlerUser(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getLicenseWorkspaceAccess(supabase, user, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canExchangeLicenseMessages(access.row.status)) {
    return NextResponse.json(
      { error: "Messaging is only available while the request is pending or accepted." },
      { status: 400 }
    );
  }

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (text.length < 1 || text.length > 8000) {
    return NextResponse.json({ error: "Message must be 1–8000 characters." }, { status: 400 });
  }

  const author_role = access.role === "creator" ? "creator" : "brand";

  const { data, error } = await supabase
    .from("license_request_messages")
    .insert({
      license_request_id: id,
      author_role,
      body: text,
    })
    .select("id, author_role, body, created_at")
    .single();

  if (error) {
    console.error("license_request_messages insert:", error);
    return NextResponse.json(
      { error: error.message.includes("does not exist") ? "Run migration 011_license_workspace_messages.sql" : error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: data });
}
