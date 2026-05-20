import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

const schema = z.object({
  minLicenseFeeInr: z.number().int().positive().max(100_000_000).optional(),
  consentVideoCompleted: z.boolean().optional(),
  platformLicenseSigned: z.boolean().optional(),
});

async function supabaseFromCookies() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore
          }
        },
      },
    }
  );
}

export async function PATCH(request: Request) {
  const supabase = await supabaseFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.minLicenseFeeInr !== undefined) {
    updates.min_license_fee_inr = parsed.data.minLicenseFeeInr;
  }
  if (parsed.data.consentVideoCompleted !== undefined) {
    updates.consent_video_completed = parsed.data.consentVideoCompleted;
  }
  if (parsed.data.platformLicenseSigned !== undefined) {
    updates.platform_license_signed = parsed.data.platformLicenseSigned;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    console.error("onboarding PATCH:", error);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
