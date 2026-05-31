import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/brand/requireBrandUser");
vi.mock("@/lib/supabase/route");
vi.mock("@/lib/logger");
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "fixed-doc-id"),
}));

import { requireBrandUser } from "@/lib/brand/requireBrandUser";
import { createRouteClient } from "@/lib/supabase/route";
import { POST } from "./route";
import { UnauthorizedError } from "@/lib/errors/apiError";

const brandUser = { id: "brand-user-1", email: "brand.workspace@example.com" };

function documentsSupabaseMock(
  opts: {
    uploadError?: { message: string } | null;
    insertError?: { message: string } | null;
  } = {}
) {
  const { uploadError = null, insertError = null } = opts;
  const storageFrom = {
    upload: vi.fn().mockResolvedValue({ error: uploadError }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: "https://signed.example/upload" },
      error: null,
    }),
    remove: vi.fn().mockResolvedValue({ error: null }),
  };
  const insertChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: insertError
        ? null
        : {
            id: "fixed-doc-id",
            document_type: "mca_registration",
            file_name: "cert.pdf",
            mime_type: "application/pdf",
            file_size: 512,
            file_path: "brand-user-1/brand/verification/fixed-doc-id-cert.pdf",
            created_at: "2026-05-31T00:00:00.000Z",
          },
      error: insertError,
    }),
  };
  return {
    storage: { from: vi.fn(() => storageFrom) },
    from: vi.fn(() => insertChain),
  };
}

function uploadRequest(file: File, documentType = "mca_registration") {
  const form = new FormData();
  form.set("documentType", documentType);
  form.set("file", file);
  return new Request("http://test", { method: "POST", body: form });
}

describe("POST /api/brand/profile/documents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a PDF and returns document metadata", async () => {
    vi.mocked(requireBrandUser).mockResolvedValue(brandUser as never);
    vi.mocked(createRouteClient).mockResolvedValue(documentsSupabaseMock() as never);

    const file = new File([new Uint8Array([1, 2, 3])], "cert.pdf", { type: "application/pdf" });
    const response = await POST(uploadRequest(file));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.document.fileName).toBe("cert.pdf");
    expect(json.data.document.documentType).toBe("mca_registration");
    expect(json.data.document.downloadUrl).toBe("https://signed.example/upload");
  });

  it("rejects unknown document types", async () => {
    vi.mocked(requireBrandUser).mockResolvedValue(brandUser as never);
    vi.mocked(createRouteClient).mockResolvedValue(documentsSupabaseMock() as never);

    const file = new File([new Uint8Array([1])], "cert.pdf", { type: "application/pdf" });
    const response = await POST(uploadRequest(file, "invalid_type"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid_input");
  });

  it("rejects unsupported mime types", async () => {
    vi.mocked(requireBrandUser).mockResolvedValue(brandUser as never);
    vi.mocked(createRouteClient).mockResolvedValue(documentsSupabaseMock() as never);

    const file = new File([new Uint8Array([1])], "notes.txt", { type: "text/plain" });
    const response = await POST(uploadRequest(file));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid_type");
  });

  it("returns storage_mime_not_allowed when bucket rejects PDF", async () => {
    vi.mocked(requireBrandUser).mockResolvedValue(brandUser as never);
    vi.mocked(createRouteClient).mockResolvedValue(
      documentsSupabaseMock({
        uploadError: { message: "mime type application/pdf is not supported" },
      }) as never
    );

    const file = new File([new Uint8Array([1])], "cert.pdf", { type: "application/pdf" });
    const response = await POST(uploadRequest(file));
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.error.code).toBe("storage_mime_not_allowed");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireBrandUser).mockRejectedValue(new UnauthorizedError());

    const file = new File([new Uint8Array([1])], "cert.pdf", { type: "application/pdf" });
    const response = await POST(uploadRequest(file));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("unauthorized");
  });
});
