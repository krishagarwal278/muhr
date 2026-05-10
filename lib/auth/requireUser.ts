import "server-only";

import { UnauthorizedError } from "@/lib/errors/apiError";
import { getUser } from "@/lib/supabase/server";

/** Supabase session user or throws {@link UnauthorizedError}. */
export async function requireUser() {
  const user = await getUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
