import { describe, expect, it } from "vitest";
import {
  getMiddlewareUserFromCookies,
  supabaseAuthCookieStorageKey,
} from "./middlewareSessionFromCookies";

describe("middlewareSessionFromCookies", () => {
  it("derives storage key from project url", () => {
    expect(supabaseAuthCookieStorageKey("https://abcdefgh.supabase.co")).toBe(
      "sb-abcdefgh-auth-token"
    );
  });

  it("returns user from a valid session cookie", () => {
    const key = "sb-test-auth-token";
    const session = {
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "rt",
      user: { id: "user-1", email: "a@b.co" },
    };
    const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;

    const user = getMiddlewareUserFromCookies(
      [{ name: key, value }],
      "https://test.supabase.co"
    );
    expect(user?.id).toBe("user-1");
  });

  it("allows expired access token when refresh token exists", () => {
    const key = "sb-test-auth-token";
    const session = {
      expires_at: Math.floor(Date.now() / 1000) - 3600,
      refresh_token: "rt",
      user: { id: "user-2", email: "c@d.co" },
    };
    const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;

    const user = getMiddlewareUserFromCookies(
      [{ name: key, value }],
      "https://test.supabase.co"
    );
    expect(user?.id).toBe("user-2");
  });
});
