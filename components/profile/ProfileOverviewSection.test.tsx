import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileOverviewSection } from "./ProfileOverviewSection";

const profilePayload = {
  ok: true,
  data: {
    fullName: "Krish Agarwal",
    phone: "+919819499968",
    email: "krish@example.com",
    addressLine1: "801, Oberoi Sky Garden",
    addressCity: "Mumbai",
    addressPinCode: "400001",
    followerCount: 108000,
    handle: "krish",
    acceptingRequests: true,
    profileLinks: [],
    avatarUrl: null,
  },
};

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("ProfileOverviewSection", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: RequestInfo | URL) => {
        const path = String(url);
        if (path.includes("/api/profile")) {
          return jsonResponse(profilePayload);
        }
        return jsonResponse({ ok: false }, 404);
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads profile overview using SectionCard and shows address fields", async () => {
    render(<ProfileOverviewSection />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Profile overview" })).toBeTruthy();
    });

    expect(screen.getByText("Krish Agarwal")).toBeTruthy();
    expect(screen.getByText("801, Oberoi Sky Garden")).toBeTruthy();
    expect(screen.getByText("Mumbai")).toBeTruthy();
    expect(screen.getByText("Profile photo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload profile photo" })).toBeTruthy();
  });

  it("opens the existing edit form with FormField controls", async () => {
    const user = userEvent.setup();
    render(<ProfileOverviewSection />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    });

    const overview = document.getElementById("profile-overview");
    expect(overview).toBeTruthy();
    await user.click(within(overview!).getByRole("button", { name: "Edit" }));

    expect(screen.getByText("Full name")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save profile" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });
});
