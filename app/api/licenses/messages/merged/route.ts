import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  try {
    const { searchParams } = new URL(request.url);
    const ids = parseRequestIds(searchParams.get("request_ids"));
    if (ids.length < 1 || ids.length > 24) {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Provide 1–24 request_ids (comma-separated UUIDs)." } },
        { status: 400 }
      );
    }

    const supabase = await createRouteClient();
    const user = await getRouteHandlerUser(supabase);

    if (!user) {
      return Response.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const em = user.email?.trim().toLowerCase();
    if (!em) {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Account email required." } },
        { status: 400 }
      );
    }

    const { data: rows, error: rowErr } = await supabase
      .from("license_requests")
      .select("id, creator_id, brand_email, brand_user_id")
      .in("id", ids);

    if (rowErr) {
      logger.error("merged_messages_rows_error", { ids, code: rowErr.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't load this thread right now. Please try again in a moment." } },
        { status: 500 }
      );
    }

    const list = rows ?? [];
    if (list.length !== ids.length) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "One or more requests were not found." } },
        { status: 404 }
      );
    }

    const creatorIds = new Set(list.map((r) => r.creator_id as string));
    if (creatorIds.size !== 1) {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Merged thread is only for one creator." } },
        { status: 400 }
      );
    }

    const brandEmails = new Set(
      list.map((r) => (typeof r.brand_email === "string" ? r.brand_email.trim().toLowerCase() : ""))
    );
    if (brandEmails.size !== 1 || !brandEmails.has(em)) {
      return Response.json(
        { ok: false, error: { code: "forbidden", message: "Forbidden" } },
        { status: 403 }
      );
    }

    const { data: messages, error: msgErr } = await supabase
      .from("license_request_messages")
      .select("id, license_request_id, author_role, body, created_at")
      .in("license_request_id", ids)
      .order("created_at", { ascending: true });

    if (msgErr) {
      logger.error("merged_messages_fetch_error", { ids, code: msgErr.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't load this thread right now. Please try again in a moment." } },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, data: { messages: messages ?? [] } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
