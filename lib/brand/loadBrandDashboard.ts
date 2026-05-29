import { createServerClient, getUser } from "@/lib/supabase/server";
import {
  aggregateLicenseRequestStatuses,
  pickCanonicalLicenseRequest,
} from "@/lib/brand/brandLicenseThreadMerge";
import { linkBrandLicenseRequestsForUser } from "@/lib/license/linkBrandLicenseRequests";
import { createServiceRoleClient } from "@/lib/supabase/service";

export type BrandLicenseRow = {
  id: string;
  creator_id: string;
  status: string;
  budget_inr: number | null;
  agreed_budget_inr?: number | null;
  expires_at: string;
  created_at: string;
  creator_profile:
    | { id: string; handle: string | null; display_name: string | null }
    | { id: string; handle: string | null; display_name: string | null }[]
    | null;
};

export type BrandDashboardCreator = {
  creatorId: string;
  requestId: string;
  handle: string | null;
  displayName: string;
  status: string;
  budgetInr: number | null;
  createdAt: string;
  expiresAt: string;
};

export type BrandDashboardPayload = {
  creators: BrandDashboardCreator[];
  metrics: {
    active: number;
    pending: number;
    creatorsTouched: number;
    expiring14d: number;
  };
  error: string | null;
};

/** One row per creator (deduped license requests for the same brand + creator). */
export type BrandLicenseListItem = {
  id: string;
  creator_id: string;
  status: string;
  budget_inr: number | null;
  agreed_budget_inr: number | null;
  created_at: string;
  expires_at: string;
  handle: string | null;
  displayName: string;
};

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export async function loadBrandDashboard(): Promise<BrandDashboardPayload> {
  const empty: BrandDashboardPayload = {
    creators: [],
    metrics: { active: 0, pending: 0, creatorsTouched: 0, expiring14d: 0 },
    error: null,
  };

  const user = await getUser();
  if (!user?.email) {
    return empty;
  }

  const supabase = await createServerClient();
  const admin = createServiceRoleClient();
  if (admin) {
    await linkBrandLicenseRequestsForUser(admin, user.id, user.email);
  }

  const { data: rows, error } = await supabase
    .from("license_requests")
    .select(
      `
      id,
      creator_id,
      status,
      budget_inr,
      expires_at,
      created_at,
      creator_profile:profiles!license_requests_creator_id_fkey (
        id,
        handle,
        display_name
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[loadBrandDashboard] failed", {
      userId: user.id,
      code: error.code,
      message: error.message,
    });
    return {
      ...empty,
      error: "load_failed",
    };
  }

  const list = (rows ?? []) as unknown as BrandLicenseRow[];
  // RLS also returns rows where we are the creator. Brand shell should only list requests where we
  // are the brand party (another creator), otherwise "Manage license" links hit /brand/.../requests
  // and resolve as creator role → 404.
  const brandPartyRows = list.filter((row) => row.creator_id !== user.id);
  const now = new Date();
  const in14 = addDays(now, 14);

  const byCreator = new Map<string, BrandLicenseRow[]>();
  for (const row of brandPartyRows) {
    const arr = byCreator.get(row.creator_id) ?? [];
    arr.push(row);
    byCreator.set(row.creator_id, arr);
  }

  const active = [...byCreator.values()].filter((g) => g.some((r) => r.status === "accepted")).length;
  const pending = [...byCreator.values()].filter(
    (g) => !g.some((r) => r.status === "accepted") && g.some((r) => r.status === "pending")
  ).length;
  const creatorsTouched = byCreator.size;

  const expiring14d = brandPartyRows.filter((r) => {
    if (r.status !== "accepted" || !r.expires_at) return false;
    const exp = new Date(r.expires_at);
    return exp >= now && exp <= in14;
  }).length;

  const creators: BrandDashboardCreator[] = [];
  for (const [, group] of byCreator) {
    const canonical = pickCanonicalLicenseRequest(group);
    const raw = canonical.creator_profile;
    const p = Array.isArray(raw) ? raw[0] ?? null : raw;
    const handle = p?.handle?.trim() || null;
    const displayName =
      (p?.display_name && p.display_name.trim()) || handle || "Creator";
    creators.push({
      creatorId: canonical.creator_id,
      requestId: canonical.id,
      handle,
      displayName,
      status: aggregateLicenseRequestStatuses(group.map((r) => r.status)),
      budgetInr: canonical.budget_inr,
      createdAt: canonical.created_at,
      expiresAt: canonical.expires_at,
    });
  }
  creators.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    creators,
    metrics: {
      active,
      pending,
      creatorsTouched,
      expiring14d,
    },
    error: null,
  };
}

export async function loadBrandLicenseList(): Promise<{ rows: BrandLicenseListItem[]; error: string | null }> {
  const user = await getUser();
  if (!user?.email) {
    return { rows: [], error: null };
  }

  const supabase = await createServerClient();
  const admin = createServiceRoleClient();
  if (admin) {
    await linkBrandLicenseRequestsForUser(admin, user.id, user.email);
  }

  const { data: rows, error } = await supabase
    .from("license_requests")
    .select(
      `
      id,
      creator_id,
      status,
      budget_inr,
      agreed_budget_inr,
      expires_at,
      created_at,
      creator_profile:profiles!license_requests_creator_id_fkey (
        id,
        handle,
        display_name
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[loadBrandLicenseList] failed", {
      userId: user.id,
      code: error.code,
      message: error.message,
    });
    return { rows: [], error: "load_failed" };
  }

  const list = (rows ?? []) as unknown as BrandLicenseRow[];
  const brandPartyRows = list.filter((row) => row.creator_id !== user.id);

  const byCreator = new Map<string, BrandLicenseRow[]>();
  for (const row of brandPartyRows) {
    const arr = byCreator.get(row.creator_id) ?? [];
    arr.push(row);
    byCreator.set(row.creator_id, arr);
  }

  const out: BrandLicenseListItem[] = [];
  for (const [, group] of byCreator) {
    const canonical = pickCanonicalLicenseRequest(group);
    const raw = canonical.creator_profile;
    const p = Array.isArray(raw) ? raw[0] ?? null : raw;
    const handle = p?.handle?.trim() || null;
    const displayName =
      (p?.display_name && p.display_name.trim()) || (handle ? (handle.startsWith("@") ? handle : `@${handle}`) : null) || "Creator";
    out.push({
      id: canonical.id,
      creator_id: canonical.creator_id,
      status: aggregateLicenseRequestStatuses(group.map((r) => r.status)),
      budget_inr: canonical.budget_inr,
      agreed_budget_inr: canonical.agreed_budget_inr ?? null,
      created_at: canonical.created_at,
      expires_at: canonical.expires_at,
      handle,
      displayName,
    });
  }
  out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { rows: out, error: null };
}
