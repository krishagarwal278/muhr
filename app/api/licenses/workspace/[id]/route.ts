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

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await supabaseFromCookies();
  const user = await getRouteHandlerUser(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getLicenseWorkspaceAccess(supabase, user, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let creator: { handle: string | null; display_name: string | null } | null = null;
  if (access.role === "brand") {
    const { data: prof } = await supabase
      .from("profiles")
      .select("handle, display_name")
      .eq("id", access.row.creator_id)
      .maybeSingle();
    if (prof && typeof prof === "object") {
      creator = {
        handle: typeof prof.handle === "string" ? prof.handle : null,
        display_name: typeof prof.display_name === "string" ? prof.display_name : null,
      };
    }
  }

  const { searchParams } = new URL(request.url);
  const embedMessages = searchParams.get("embed") === "messages";

  let messages: unknown[] | undefined;
  if (embedMessages) {
    if (!canExchangeLicenseMessages(access.row.status)) {
      messages = [];
    } else {
      const { data, error } = await supabase
        .from("license_request_messages")
        .select("id, author_role, body, created_at")
        .eq("license_request_id", id)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("workspace GET embed messages:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      messages = data ?? [];
    }
  }

  return NextResponse.json({
    request: access.row,
    role: access.role,
    creator,
    ...(embedMessages ? { messages } : {}),
  });
}
