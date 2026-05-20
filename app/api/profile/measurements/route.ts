import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

const schema = z.object({
  height: z.string().trim().min(1).max(40),
  weight: z.string().trim().min(1).max(40),
  chest: z.string().trim().min(1).max(40),
  waist: z.string().trim().min(1).max(40),
  hips: z.string().trim().min(1).max(40),
  shoe_size: z.string().trim().min(1).max(40),
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

export async function GET() {
  const supabase = await supabaseFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("height, weight, chest, waist, hips, shoe_size, min_license_fee_inr, consent_video_completed, platform_license_signed")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }

  return NextResponse.json({
    height: data?.height ?? "",
    weight: data?.weight ?? "",
    chest: data?.chest ?? "",
    waist: data?.waist ?? "",
    hips: data?.hips ?? "",
    shoeSize: data?.shoe_size ?? "",
    minLicenseFeeInr: data?.min_license_fee_inr ?? null,
    consentVideoCompleted: data?.consent_video_completed ?? false,
    platformLicenseSigned: data?.platform_license_signed ?? false,
  });
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
    return NextResponse.json({ error: "Please fill in all measurement fields." }, { status: 400 });
  }

  const m = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      height: m.height,
      weight: m.weight,
      chest: m.chest,
      waist: m.waist,
      hips: m.hips,
      shoe_size: m.shoe_size,
    })
    .eq("id", user.id);

  if (error) {
    console.error("measurements PATCH:", error);
    return NextResponse.json({ error: "Could not save measurements" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
