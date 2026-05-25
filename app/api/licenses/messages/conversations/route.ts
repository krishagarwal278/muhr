import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import {
  aggregateLicenseRequestStatuses,
  pickCanonicalLicenseRequest,
} from "@/lib/brand/brandLicenseThreadMerge";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileJoin = { handle: string | null; display_name: string | null } | null;
type LicenseReqListRow = {
  id: string;
  creator_id: string;
  status: string;
  brand_name: string;
  brand_company: string | null;
  brand_email: string;
  brand_user_id?: string | null;
  created_at: string;
  creator_profile: ProfileJoin | ProfileJoin[] | null;
};

type MsgRow = {
  license_request_id: string;
  author_role: string;
  body: string;
  created_at: string;
};

type LicenseConversationSummary = {
  id: string;
  status: string;
  my_role: "creator" | "brand";
  brand_user_id: string | null;
  counterparty_label: string;
  counterparty_detail: string;
  workspace_href: string;
  last_message_body: string | null;
  last_message_at: string | null;
  last_author_role: string | null;
  has_unread_hint: boolean;
  merged_request_ids?: string[];
};

function creatorCounterparty(row: Pick<LicenseReqListRow, "brand_name" | "brand_company" | "brand_email">) {
  const company = row.brand_company?.trim() || null;
  const name = row.brand_name?.trim() || null;
  const email = row.brand_email?.trim() || null;

  if (company) {
    return {
      counterparty_label: company,
      counterparty_detail: [name, email].filter(Boolean).join(" · ") || "Brand",
    };
  }
  return {
    counterparty_label: name || email || "Brand",
    counterparty_detail: name && email ? email : name ? "License request" : "License request",
  };
}

function latestPreviewAcrossRequests(
  requestIds: string[],
  latestByRequest: Map<string, { body: string; created_at: string; author_role: string }>
) {
  let best: { body: string; created_at: string; author_role: string } | null = null;
  for (const rid of requestIds) {
    const m = latestByRequest.get(rid);
    if (!m) continue;
    if (!best || new Date(m.created_at) > new Date(best.created_at)) best = m;
  }
  return best;
}

export async function GET() {
  try {
    const supabase = await createRouteClient();
    const user = await getRouteHandlerUser(supabase);

    if (!user) {
      return Response.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { data: rows, error } = await supabase
      .from("license_requests")
      .select(
        `
        id,
        creator_id,
        status,
        brand_name,
        brand_company,
        brand_email,
        brand_user_id,
        created_at,
        creator_profile:profiles!license_requests_creator_id_fkey (
          handle,
          display_name
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(120);

    if (error) {
      logger.error("conversations_list_error", { code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't load your conversations right now. Please try again in a moment." } },
        { status: 500 }
      );
    }

    const list = (rows ?? []) as LicenseReqListRow[];
    const ids = list.map((r) => r.id);
    const latestByRequest = new Map<
      string,
      { body: string; created_at: string; author_role: string }
    >();

    if (ids.length > 0) {
      const { data: msgs, error: msgErr } = await supabase
        .from("license_request_messages")
        .select("license_request_id, author_role, body, created_at")
        .in("license_request_id", ids)
        .order("created_at", { ascending: false })
        .limit(1200);

      if (msgErr) {
        logger.warn("conversations_messages_error", { code: msgErr.code });
      } else {
        for (const m of (msgs ?? []) as MsgRow[]) {
          if (!latestByRequest.has(m.license_request_id)) {
            latestByRequest.set(m.license_request_id, {
              body: m.body,
              created_at: m.created_at,
              author_role: m.author_role,
            });
          }
        }
      }
    }

    const conversations: LicenseConversationSummary[] = [];

    const brandByCreator = new Map<string, LicenseReqListRow[]>();
    const creatorRows: LicenseReqListRow[] = [];

    for (const row of list) {
      if (row.creator_id === user.id) {
        creatorRows.push(row);
      } else {
        const arr = brandByCreator.get(row.creator_id) ?? [];
        arr.push(row);
        brandByCreator.set(row.creator_id, arr);
      }
    }

    for (const row of creatorRows) {
      const my_role: "creator" | "brand" = "creator";
      const { counterparty_label, counterparty_detail } = creatorCounterparty(row);
      const workspace_href = `/licenses/requests/${row.id}`;
      const last = latestByRequest.get(row.id);
      const last_message_body = last?.body ?? null;
      const last_message_at = last?.created_at ?? null;
      const last_author_role = last?.author_role ?? null;
      const has_unread_hint =
        last_author_role != null && last_author_role !== "creator";

      conversations.push({
        id: row.id,
        status: row.status,
        my_role,
        brand_user_id: row.brand_user_id ?? null,
        counterparty_label,
        counterparty_detail,
        workspace_href,
        last_message_body,
        last_message_at,
        last_author_role,
        has_unread_hint,
      });
    }

    for (const [, group] of brandByCreator) {
      const canonical = pickCanonicalLicenseRequest(group);
      const mergeIds = group.map((g) => g.id).sort();
      const my_role: "creator" | "brand" = "brand";
      const raw = canonical.creator_profile;
      const p = Array.isArray(raw) ? raw[0] ?? null : raw;
      const handle = p?.handle?.trim() || null;
      const displayName =
        (p?.display_name && p.display_name.trim()) ||
        (handle ? (handle.startsWith("@") ? handle : `@${handle}`) : null);

      const counterparty_label = displayName || "Creator";
      const counterparty_detail = handle ? `@${handle.replace(/^@/, "")}` : "License request";
      const workspace_href = `/brand/licenses/requests/${canonical.id}`;
      const last = latestPreviewAcrossRequests(mergeIds, latestByRequest);
      const last_message_body = last?.body ?? null;
      const last_message_at = last?.created_at ?? null;
      const last_author_role = last?.author_role ?? null;
      const has_unread_hint = last_author_role != null && last_author_role !== "brand";
      const status = aggregateLicenseRequestStatuses(group.map((g) => g.status));

      conversations.push({
        id: canonical.id,
        status,
        my_role,
        brand_user_id: canonical.brand_user_id ?? null,
        counterparty_label,
        counterparty_detail,
        workspace_href,
        last_message_body,
        last_message_at,
        last_author_role,
        has_unread_hint,
        ...(mergeIds.length > 1 ? { merged_request_ids: mergeIds } : {}),
      });
    }

    conversations.sort((a, b) => {
      const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return b.id.localeCompare(a.id);
    });

    return Response.json({ ok: true, data: { conversations } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
