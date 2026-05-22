import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rules } = await supabase
    .from("consent_rules")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!rules) {
    return NextResponse.json({
      channels: [],
      territories: [],
      blockedCategories: ["politics"],
      allowVoiceSynthesis: false,
      allowFaceReenactment: false,
      requireApprovalPerUse: true,
      defaultDurationDays: 90,
    });
  }

  return NextResponse.json({
    channels: rules.channels || [],
    territories: rules.territories || [],
    blockedCategories: rules.blocked_categories || ["politics"],
    allowVoiceSynthesis: rules.allow_voice_synthesis || false,
    allowFaceReenactment: rules.allow_face_reenactment || false,
    requireApprovalPerUse: rules.require_approval_per_use ?? true,
    defaultDurationDays: rules.default_duration_days || 90,
  });
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { error } = await supabase
    .from("consent_rules")
    .upsert({
      user_id: user.id,
      channels: body.channels || [],
      territories: body.territories || [],
      blocked_categories: body.blockedCategories || [],
      allow_voice_synthesis: body.allowVoiceSynthesis || false,
      allow_face_reenactment: body.allowFaceReenactment || false,
      require_approval_per_use: body.requireApprovalPerUse ?? true,
      default_duration_days: body.defaultDurationDays || 90,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    });

  if (error) {
    console.error("Error saving consent rules:", error);
    return NextResponse.json({ error: "Failed to save rules" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Consent rules saved",
  });
}
