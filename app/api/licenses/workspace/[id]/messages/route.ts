import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { toApiError } from "@/lib/errors/apiError";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { canExchangeLicenseMessages } from "@/lib/license/workspaceMessages";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const supabase = await createRouteClient();
    const user = await getRouteHandlerUser(supabase);

    if (!user) {
      return Response.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const access = await getLicenseWorkspaceAccess(supabase, user, id);
    if (!access) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Not found" } },
        { status: 404 }
      );
    }

    if (!canExchangeLicenseMessages(access.row.status)) {
      return Response.json({ ok: true, data: { messages: [], role: access.role } });
    }

    const { data, error } = await supabase
      .from("license_request_messages")
      .select("id, author_role, body, created_at")
      .eq("license_request_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("workspace_messages_get_error", { requestId: id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't load the messages right now. Please try again in a moment." } },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, data: { messages: data ?? [], role: access.role } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const supabase = await createRouteClient();
    const user = await getRouteHandlerUser(supabase);

    if (!user) {
      return Response.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const access = await getLicenseWorkspaceAccess(supabase, user, id);
    if (!access) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Not found" } },
        { status: 404 }
      );
    }

    if (!canExchangeLicenseMessages(access.row.status)) {
      return Response.json(
        { ok: false, error: { code: "invalid_state", message: "Messaging is only available while the request is pending or accepted." } },
        { status: 400 }
      );
    }

    let body: { body?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_json", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (text.length < 1 || text.length > 8000) {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Message must be 1–8000 characters." } },
        { status: 400 }
      );
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
      logger.error("workspace_messages_insert_error", { requestId: id, authorRole: author_role, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't send that message right now. Please try again in a moment." } },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, data: { message: data } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
