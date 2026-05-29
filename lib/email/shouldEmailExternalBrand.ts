import { isBrandWorkspaceUser } from "@/lib/brand/brandPreviewSignIn";

/** External brands submitted via a creator's public Muhr card (no signed-in brand account). */
export function shouldEmailExternalBrand(opts: {
  brandEmail: string;
  brandUserId?: string | null;
}): boolean {
  if (opts.brandUserId) return false;
  if (isBrandWorkspaceUser(opts.brandEmail)) return false;
  return true;
}
