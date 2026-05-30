import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/requireUser");
vi.mock("@/lib/supabase/route");
vi.mock("@/lib/logger");

import { requireUser } from "@/lib/auth/requireUser";
import { createRouteClient } from "@/lib/supabase/route";
import { POST, DELETE } from "./route";
import { UnauthorizedError } from "@/lib/errors/apiError";

describe("POST /api/profile/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when no file is provided", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: "user-1", email: "a@b.com" } as never);
    vi.mocked(createRouteClient).mockResolvedValue({} as never);

    const formData = new FormData();
    const request = new Request("http://test", { method: "POST", body: formData });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("missing_file");
  });

  it("returns 400 for unsupported mime types", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: "user-1", email: "a@b.com" } as never);
    vi.mocked(createRouteClient).mockResolvedValue({} as never);

    const file = new File([new Uint8Array([1])], "x.gif", { type: "image/gif" });
    const formData = new FormData();
    formData.set("file", file);
    const request = new Request("http://test", { method: "POST", body: formData });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid_type");
  });

  it("uploads and returns a signed avatar URL", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: "user-1", email: "a@b.com" } as never);

    const storageFrom = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://cdn.example/avatar.jpg" },
        error: null,
      }),
    });

    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { avatar_path: null }, error: null }),
      update: vi.fn().mockReturnThis(),
    };
    profilesChain.update.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") return profilesChain;
        return profilesChain;
      }),
      storage: { from: storageFrom },
    };
    vi.mocked(createRouteClient).mockResolvedValue(mockSupabase as never);

    const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("file", file);
    const request = new Request("http://test", { method: "POST", body: formData });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.avatarUrl).toBe("https://cdn.example/avatar.jpg");
    expect(storageFrom).toHaveBeenCalledWith("assets");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUser).mockRejectedValue(new UnauthorizedError());

    const formData = new FormData();
    formData.set("file", new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" }));
    const response = await POST(new Request("http://test", { method: "POST", body: formData }));

    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/profile/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears avatar_path and returns null url", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: "user-1", email: "a@b.com" } as never);

    const storageFrom = vi.fn().mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: null }),
    });

    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { avatar_path: "user-1/avatar/old.jpg" },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    };
    profilesChain.update.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      from: vi.fn(() => profilesChain),
      storage: { from: storageFrom },
    };
    vi.mocked(createRouteClient).mockResolvedValue(mockSupabase as never);

    const response = await DELETE();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.avatarUrl).toBeNull();
    expect(storageFrom).toHaveBeenCalledWith("assets");
  });
});
