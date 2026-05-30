import { describe, expect, it } from "vitest";
import {
  AVATAR_MIGRATION_HINT,
  isAvatarColumnMissing,
  isProfileAvatarMime,
  profileAvatarStoragePath,
  PROFILE_AVATAR_MAX_BYTES,
} from "./avatar";

describe("profile avatar helpers", () => {
  it("accepts supported image mime types", () => {
    expect(isProfileAvatarMime("image/jpeg")).toBe(true);
    expect(isProfileAvatarMime("image/png")).toBe(true);
    expect(isProfileAvatarMime("image/webp")).toBe(true);
    expect(isProfileAvatarMime("image/gif")).toBe(false);
  });

  it("builds a user-scoped storage path with a safe extension", () => {
    const path = profileAvatarStoragePath("user-1", "photo.PNG");
    expect(path).toMatch(/^user-1\/avatar\/\d+\.png$/);
    expect(profileAvatarStoragePath("user-1", "evil.exe")).toMatch(/\.jpg$/);
  });

  it("detects missing avatar_path column errors", () => {
    expect(isAvatarColumnMissing({ code: "42703" })).toBe(true);
    expect(isAvatarColumnMissing({ message: "column avatar_path does not exist" })).toBe(true);
    expect(isAvatarColumnMissing({ code: "23505" })).toBe(false);
  });

  it("exposes migration hint and max upload size", () => {
    expect(AVATAR_MIGRATION_HINT).toContain("028_profile_avatar");
    expect(PROFILE_AVATAR_MAX_BYTES).toBe(5 * 1024 * 1024);
  });
});
