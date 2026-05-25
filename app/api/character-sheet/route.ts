import { requireUser } from "@/lib/auth/requireUser";
import { fetchCharacterSheetStatus } from "@/lib/character-sheet/server";
import { toApiError } from "@/lib/errors/apiError";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const status = await fetchCharacterSheetStatus(supabase, user.id);
    return Response.json({ ok: true, data: status });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
