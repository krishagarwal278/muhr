import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { toApiError } from "@/lib/errors/apiError";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { canExchangeLicenseMessages } from "@/lib/license/workspaceMessages";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
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
          logger.error("workspace_messages_fetch_error", { requestId: id, code: error.code });
          return Response.json(
            { ok: false, error: { code: "db_error", message: "We couldn't load the messages right now. Please try again in a moment." } },
            { status: 500 }
          );
        }
        messages = data ?? [];
      }
    }

    return Response.json({
      ok: true,
      data: {
        request: access.row,
        role: access.role,
        creator,
        ...(embedMessages ? { messages } : {}),
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
