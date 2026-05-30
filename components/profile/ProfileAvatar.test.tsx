import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileAvatar, PROFILE_AVATAR_UPDATED_EVENT } from "./ProfileAvatar";

describe("ProfileAvatar", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { avatarUrl: "https://cdn.example/new.jpg" } }),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders initials when there is no photo (read-only)", () => {
    render(<ProfileAvatar name="Krish Agarwal" size="sm" />);
    expect(screen.getByText("K")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("uses FormField copy and a single photo control for upload", () => {
    render(<ProfileAvatar name="Krish" editable />);
    expect(screen.getByText("Profile photo")).toBeTruthy();
    expect(screen.getByText(/Click the photo to upload/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload profile photo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove profile photo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Upload" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
  });

  it("places the upload hint beside the photo in inline layout", () => {
    render(<ProfileAvatar name="Krish" editable layout="inline" />);
    const hint = screen.getByText(/Click the photo to upload/);
    expect(hint.className).toContain("flex-1");
    expect(screen.getByRole("button", { name: "Upload profile photo" }).parentElement).toContain(hint);
  });

  it("switches to remove when a photo exists and confirms via ConfirmDialog", async () => {
    const user = userEvent.setup();
    const confirmRemove = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { avatarUrl: null } }),
    });
    vi.stubGlobal("fetch", confirmRemove);

    const onAvatarChange = vi.fn();
    render(
      <ProfileAvatar
        name="Krish"
        editable
        avatarUrl="https://cdn.example/avatar.jpg"
        onAvatarChange={onAvatarChange}
      />,
    );

    expect(screen.getByText(/Click the photo to remove/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Remove profile photo" }));
    expect(screen.getByRole("heading", { name: "Remove profile photo?" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(confirmRemove).toHaveBeenCalledWith("/api/profile/avatar", { method: "DELETE" });
    });
    expect(onAvatarChange).toHaveBeenCalledWith(null);
  });

  it("broadcasts avatar updates for the sidebar", async () => {
    const user = userEvent.setup();
    const listener = vi.fn();
    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, listener);

    render(<ProfileAvatar name="Krish" editable onAvatarChange={vi.fn()} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array([1])], "photo.jpg", { type: "image/jpeg" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(listener).toHaveBeenCalled();
    });

    const event = listener.mock.calls[0][0] as CustomEvent<{ avatarUrl: string | null }>;
    expect(event.detail.avatarUrl).toBe("https://cdn.example/new.jpg");
    window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, listener);
  });
});
