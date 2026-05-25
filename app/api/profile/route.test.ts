import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/requireUser");
vi.mock("@/lib/supabase/route");
vi.mock("@/lib/logger");

import { requireUser } from "@/lib/auth/requireUser";
import { createRouteClient } from "@/lib/supabase/route";
import { GET, PATCH } from "./route";
import { UnauthorizedError } from "@/lib/errors/apiError";

describe("GET /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns profile data when authenticated", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    vi.mocked(requireUser).mockResolvedValue(mockUser as never);

    const mockProfile = {
      handle: "testuser",
      display_name: "Test User",
      accepting_requests: true,
      licensing_notes: "My notes",
      min_license_fee_inr: 10000,
      follower_count: 50000,
      full_name: "Test User",
      phone: "+911234567890",
      address_line1: "123 Test St",
      address_city: "Mumbai",
      address_pin_code: "400001",
      platform_license_signed: true,
    };

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    };
    vi.mocked(createRouteClient).mockResolvedValue(mockSupabase as never);

    const response = await GET();
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.data.handle).toBe("testuser");
    expect(json.data.displayName).toBe("Test User");
    expect(json.data.acceptingRequests).toBe(true);
    expect(json.data.email).toBe("test@example.com");
    expect(json.data.followerCount).toBe(50000);
  });

  it("returns default values for missing profile", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    vi.mocked(requireUser).mockResolvedValue(mockUser as never);

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    vi.mocked(createRouteClient).mockResolvedValue(mockSupabase as never);

    const response = await GET();
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.data.handle).toBeNull();
    expect(json.data.displayName).toBeNull();
    expect(json.data.acceptingRequests).toBe(true);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUser).mockRejectedValue(new UnauthorizedError());

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("unauthorized");
  });
});

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates profile successfully", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    vi.mocked(requireUser).mockResolvedValue(mockUser as never);

    const updatedProfile = {
      handle: "newhandle",
      display_name: "New Name",
      accepting_requests: true,
      licensing_notes: "",
    };

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
    };
    vi.mocked(createRouteClient).mockResolvedValue(mockSupabase as never);

    const request = new Request("http://test", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: "newhandle" }),
    });

    const response = await PATCH(request);
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(mockSupabase.update).toHaveBeenCalled();
  });

  it("returns 400 for invalid handle", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    vi.mocked(requireUser).mockResolvedValue(mockUser as never);

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
    };
    vi.mocked(createRouteClient).mockResolvedValue(mockSupabase as never);

    const request = new Request("http://test", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: "ab" }),
    });

    const response = await PATCH(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.ok).toBe(false);
  });

  it("returns 409 for duplicate handle", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    vi.mocked(requireUser).mockResolvedValue(mockUser as never);

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key value" },
      }),
    };
    vi.mocked(createRouteClient).mockResolvedValue(mockSupabase as never);

    const request = new Request("http://test", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: "existinghandle" }),
    });

    const response = await PATCH(request);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("conflict");
  });

  it("returns 400 for invalid JSON", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    vi.mocked(requireUser).mockResolvedValue(mockUser as never);

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
    };
    vi.mocked(createRouteClient).mockResolvedValue(mockSupabase as never);

    const request = new Request("http://test", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    const response = await PATCH(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("invalid_json");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUser).mockRejectedValue(new UnauthorizedError());

    const request = new Request("http://test", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: "test" }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(401);
  });
});
