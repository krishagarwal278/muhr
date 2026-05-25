import { requireUser } from "@/lib/auth/requireUser";
import { generateCharacterSheet } from "@/lib/character-sheet/server";
import { toApiError } from "@/lib/errors/apiError";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    let regenerate = false;
    try {
      const body = await request.json();
      regenerate = body?.regenerate === true;
    } catch {
      // empty body is fine for first-time build
    }

    const result = await generateCharacterSheet(supabase, user.id, { regenerate });
    if (!result.ok) {
      return Response.json(
        { ok: false, error: { code: "generation_failed", message: result.error } },
        { status: 400 }
      );
    }

    return Response.json({ ok: true, data: result.data });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
