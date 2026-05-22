import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** TipTap / ProseMirror JSON root — content may be omitted on some clients */
function normalizeContractBody(doc: unknown): Record<string, unknown> | null {
  if (!isRecord(doc) || doc.type !== "doc") return null;
  const content = doc.content;
  if (content === undefined || content === null) {
    return { ...doc, content: [] };
  }
  if (!Array.isArray(content)) return null;
  return doc as Record<string, unknown>;
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    action?: string;
    contract_body?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only select columns that exist before migration 005 — asking for `contract_body` when the
  // column is missing makes PostgREST error, which we used to mis-report as 404 "Not found".
  const { data: row, error: fetchErr } = await supabase
    .from("license_requests")
    .select("id, status")
    .eq("id", id)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (fetchErr) {
    console.error("license contract prefetch:", fetchErr);
    return NextResponse.json(
      { error: "We couldn’t load this request right now. Please try again in a moment." },
      { status: 500 }
    );
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const editableStatus = row.status === "pending" || row.status === "accepted";
  if (!editableStatus) {
    return NextResponse.json(
      { error: "Contract can only be edited while the request is pending or accepted." },
      { status: 400 }
    );
  }

  if (body.action === "save") {
    const normalized = normalizeContractBody(body.contract_body);
    if (!normalized) {
      return NextResponse.json(
        { error: "Invalid document format. Try refreshing the page." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("license_requests")
      .update({
        contract_body: normalized,
        contract_updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("creator_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      const missingContractSchema =
        error.message?.includes("contract_body") || error.code === "PGRST204";
      console.error("[contract save] failed", {
        requestId: id,
        userId: user.id,
        code: error.code,
        message: error.message,
        missingContractSchema,
      });
      return NextResponse.json(
        {
          error: "We couldn’t save your changes right now. Please try again in a moment.",
        },
        { status: 500 }
      );
    }
    if (!data) {
      console.error("[contract save] update returned no row", { requestId: id, userId: user.id });
      return NextResponse.json(
        { error: "We couldn’t save your changes right now. Please try again in a moment." },
        { status: 500 }
      );
    }
    return NextResponse.json({ request: data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
