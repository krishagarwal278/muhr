import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { fetchProfileCompletionForUser } from "@/lib/profile/completionServer";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { items, percent } = await fetchProfileCompletionForUser(supabase, user.id);
    return Response.json({ ok: true, data: { percent, items } });
  } catch (err) {
    if (!(err instanceof Error && err.message === "Unauthorized")) {
      logger.error("profile_completion_error", { error: String(err) });
    }
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
