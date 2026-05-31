import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/brand/requireBrandUser");
vi.mock("@/lib/supabase/route");
vi.mock("@/lib/logger");

import { requireBrandUser } from "@/lib/brand/requireBrandUser";
import { createRouteClient } from "@/lib/supabase/route";
import { GET, PATCH } from "./route";
import { ApiHttpError, UnauthorizedError } from "@/lib/errors/apiError";

const brandUser = { id: "brand-user-1", email: "brand.workspace@example.com" };

const validBody = {
  companyName: "Acme India Pvt Ltd",
  addressLine1: "12 Marine Drive",
  addressLine2: "",
  city: "Mumbai",
  pinCode: "400001",
  primaryEmail: "legal@acme.in",
  secondaryEmail: "ops@acme.in",
  phone: "+919876543210",
  repName: "Priya Sharma",
  repEmail: "priya@acme.in",
};

function brandProfileSupabaseMock({
  profileRow = null as Record<string, unknown> | null,
  documents = [] as Record<string, unknown>[],
  upsertError = null as { message: string } | null,
} = {}) {
  const profileChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profileRow, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: upsertError }),
  };
  const documentsChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: documents, error: null }),
  };
  const storage = {
    from: vi.fn(() => ({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://signed.example/doc" },
        error: null,
      }),
    })),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "brand_profiles") return profileChain;
      if (table === "brand_verification_documents") return documentsChain;
      return profileChain;
    }),
    storage,
  };
}

describe("GET /api/brand/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns profile and documents when authenticated", async () => {
    vi.mocked(requireBrandUser).mockResolvedValue(brandUser as never);
    vi.mocked(createRouteClient).mockResolvedValue(
      brandProfileSupabaseMock({
        profileRow: {
          company_name: "Acme India Pvt Ltd",
          address_line1: "12 Marine Drive",
          address_line2: null,
          city: "Mumbai",
          pin_code: "400001",
          primary_email: "legal@acme.in",
          secondary_email: "ops@acme.in",
          phone: "+919876543210",
          rep_name: "Priya Sharma",
          rep_email: "priya@acme.in",
        },
        documents: [
          {
            id: "doc-1",
            document_type: "mca_registration",
            file_name: "cert.pdf",
            mime_type: "application/pdf",
            file_size: 1200,
            file_path: "brand-user-1/brand/verification/doc-1-cert.pdf",
            created_at: "2026-05-31T00:00:00.000Z",
          },
        ],
      }) as never
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.profile.companyName).toBe("Acme India Pvt Ltd");
    expect(json.data.documents).toHaveLength(1);
    expect(json.data.documents[0].downloadUrl).toBe("https://signed.example/doc");
  });

  it("returns empty profile when no row exists", async () => {
    vi.mocked(requireBrandUser).mockResolvedValue(brandUser as never);
    vi.mocked(createRouteClient).mockResolvedValue(brandProfileSupabaseMock() as never);

    const response = await GET();
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.data.profile).toEqual({});
    expect(json.data.documents).toEqual([]);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireBrandUser).mockRejectedValue(new UnauthorizedError());

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("unauthorized");
  });

  it("returns 403 for non-brand workspace users", async () => {
    vi.mocked(requireBrandUser).mockRejectedValue(
      new ApiHttpError(403, "forbidden", "Brand workspace access required")
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("forbidden");
  });
});

describe("PATCH /api/brand/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts profile successfully", async () => {
    vi.mocked(requireBrandUser).mockResolvedValue(brandUser as never);
    vi.mocked(createRouteClient).mockResolvedValue(brandProfileSupabaseMock() as never);

    const response = await PATCH(
      new Request("http://test", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.profile.companyName).toBe("Acme India Pvt Ltd");
    expect(json.data.profile.primaryEmail).toBe("legal@acme.in");
  });

  it("returns 400 for invalid input", async () => {
    vi.mocked(requireBrandUser).mockResolvedValue(brandUser as never);
    vi.mocked(createRouteClient).mockResolvedValue(brandProfileSupabaseMock() as never);

    const response = await PATCH(
      new Request("http://test", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validBody, companyName: "" }),
      })
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid_input");
  });
});
