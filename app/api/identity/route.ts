import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { KycStatus } from "@/types";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("kyc_status, kyc_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("profiles fetch:", error);
    return NextResponse.json({ error: "Failed to load identity status" }, { status: 500 });
  }

  const kycStatus: KycStatus = profile?.kyc_status ?? "unverified";

  return NextResponse.json({
    kycStatus,
    kycVerifiedAt: profile?.kyc_verified_at ?? null,
    kycVerified: kycStatus === "verified",
  });
}
