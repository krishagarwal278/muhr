import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getUser: () => mockGetUser(),
}));

import { UnauthorizedError } from "@/lib/errors/apiError";
import { requireUser } from "./requireUser";

describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user when authenticated", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    mockGetUser.mockResolvedValue(mockUser);

    const user = await requireUser();
    expect(user).toEqual(mockUser);
  });

  it("throws UnauthorizedError when no user", async () => {
    mockGetUser.mockResolvedValue(null);

    await expect(requireUser()).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError with custom message", async () => {
    mockGetUser.mockResolvedValue(undefined);

    await expect(requireUser()).rejects.toThrow(UnauthorizedError);
  });
});
