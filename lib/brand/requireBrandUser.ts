import "server-only";

import { ApiHttpError } from "@/lib/errors/apiError";
import { requireUser } from "@/lib/auth/requireUser";
import { isBrandWorkspaceUser } from "@/lib/brand/brandPreviewSignIn";

export async function requireBrandUser() {
  const user = await requireUser();
  if (!isBrandWorkspaceUser(user.email)) {
    throw new ApiHttpError(403, "forbidden", "Brand workspace access required");
  }
  return user;
}
