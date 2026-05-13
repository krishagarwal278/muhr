import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { readLicenseContractMigrationSql } from "@/lib/license/readContractMigrationSql";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { LicenseRequestRow } from "@/types/license";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeContractBody(doc: unknown): Record<string, unknown> | null {
  if (!isRecord(doc) || doc.type !== "doc") return null;
  const content = doc.content;
  if (content === undefined || content === null) {
    return { ...doc, content: [] };
  }
  if (!Array.isArray(content)) return null;
  return doc as Record<string, unknown>;
}

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

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await supabaseFromCookies();
  const user = await getRouteHandlerUser(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getLicenseWorkspaceAccess(supabase, user, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const full = access.row as LicenseRequestRow;
  if (full.contract_effective_at) {
    return NextResponse.json({ error: "This contract is in force; the draft can no longer be edited." }, { status: 400 });
  }

  let body: { action?: string; contract_body?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const editableStatus = full.status === "pending" || full.status === "accepted";
  if (!editableStatus) {
    return NextResponse.json(
      { error: "Contract can only be edited while the request is pending or accepted." },
      { status: 400 }
    );
  }

  if (body.action !== "save") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const normalized = normalizeContractBody(body.contract_body);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid document format. Try refreshing the page." }, { status: 400 });
  }

  const patch = {
    contract_body: normalized,
    contract_updated_at: new Date().toISOString(),
  };

  if (access.role === "creator") {
    const { data, error } = await supabase
      .from("license_requests")
      .update(patch)
      .eq("id", id)
      .eq("creator_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("workspace contract save (creator):", error);
      const missingContractSchema =
        error.message?.includes("contract_body") || error.code === "PGRST204";
      return NextResponse.json(
        {
          error: missingContractSchema ? "Missing contract_body column" : "Save failed",
          detail: error.message,
          ...(missingContractSchema
            ? {
                migration_sql: readLicenseContractMigrationSql(),
                steps: [
                  "Supabase Dashboard (same project as NEXT_PUBLIC_SUPABASE_URL)",
                  "SQL Editor → New query",
                  "Paste migration SQL for license contract, then Run",
                ],
              }
            : {}),
        },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Save did not return a row." }, { status: 500 });
    }
    return NextResponse.json({ request: data });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured (service role)" }, { status: 503 });
  }
  const brandEmail = user.email?.trim().toLowerCase();
  if (!brandEmail) {
    return NextResponse.json({ error: "Brand account must have an email." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("license_requests")
    .update(patch)
    .eq("id", id)
    .ilike("brand_email", brandEmail)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("workspace contract save (brand):", error);
    return NextResponse.json({ error: "Save failed", detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Save did not return a row." }, { status: 500 });
  }
  return NextResponse.json({ request: data });
}
