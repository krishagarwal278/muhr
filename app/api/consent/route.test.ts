import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/requireUser");
vi.mock("@/lib/supabase/route");
vi.mock("@/lib/logger");

import { requireUser } from "@/lib/auth/requireUser";
import { createRouteClient } from "@/lib/supabase/route";
import { GET, PUT } from "./route";

function consentRulesSupabaseMock(
  row: Record<string, unknown> | null,
  options?: { fetchError?: { code: string } | null; upsertError?: { code: string } | null }
) {
  const consentChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: row,
      error: options?.fetchError ?? null,
    }),
    upsert: vi.fn().mockResolvedValue({ error: options?.upsertError ?? null }),
  };
  const profileChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  };
  return {
    from: vi.fn((table: string) => (table === "profiles" ? profileChain : consentChain)),
    _chain: consentChain,
    _profileChain: profileChain,
  };
}

describe("GET /api/consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns rules and rates when row exists", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(createRouteClient).mockResolvedValue(
      consentRulesSupabaseMock({
        channels: ["instagram"],
        territories: ["IN"],
        blocked_categories: ["politics"],
        allow_voice_synthesis: false,
        allow_face_reenactment: false,
        require_approval_per_use: true,
        default_duration_days: 90,
        face_only_rate_inr: 180000,
        voice_face_rate_inr: null,
        voice_only_rate_inr: null,
        exclusivity_uplift_percent: 40,
        rate_period_days: 30,
        allow_paid_social: true,
        allow_broadcast: true,
        allow_political_content: false,
        allow_alcohol_gambling: false,
        require_exclusivity_opt_in: true,
      }) as never
    );

    const response = await GET();
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.data.faceOnlyRateInr).toBe(180000);
    expect(json.data.allowPaidSocial).toBe(true);
    expect(json.data.exclusivityUpliftPercent).toBe(40);
  });

  it("returns defaults when no row exists", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(createRouteClient).mockResolvedValue(consentRulesSupabaseMock(null) as never);

    const response = await GET();
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.data.faceOnlyRateInr).toBeNull();
    expect(json.data.exclusivityUpliftPercent).toBe(40);
    expect(json.data.requireExclusivityOptIn).toBe(true);
  });
});

describe("PUT /api/consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts rules and rates patch", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: "user-1" } as never);
    const supabase = consentRulesSupabaseMock(null);
    vi.mocked(createRouteClient).mockResolvedValue(supabase as never);

    const response = await PUT(
      new Request("http://localhost/api/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faceOnlyRateInr: 200000,
          voiceFaceRateInr: 350000,
          allowPoliticalContent: false,
          allowAlcoholGambling: true,
          allowPaidSocial: true,
          allowBroadcast: false,
        }),
      })
    );
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(supabase._chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        face_only_rate_inr: 200000,
        voice_face_rate_inr: 350000,
        allow_broadcast: false,
        blocked_categories: ["politics"],
      }),
      { onConflict: "user_id" }
    );
  });
});
