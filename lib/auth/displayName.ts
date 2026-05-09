import type { User } from "@supabase/supabase-js";

/** Best-effort display string from Supabase Auth user + user_metadata (OAuth varies by provider). */
export function displayNameFromAuthUser(user: User): string {
  const m = user.user_metadata ?? {};
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return (
    s(m.full_name) ||
    s(m.name) ||
    s(m.preferred_username) ||
    s(m.user_name) ||
    s(m.email) ||
    user.email?.split("@")[0] ||
    "User"
  );
}
