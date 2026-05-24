import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

import { sendIdentityVerificationAdminNotification } from "@/lib/email/sendIdentityVerificationAdminNotification";
import { logger } from "@/lib/logger";
import { formatProfileAddress, isProfileBasicsComplete } from "@/lib/profile/basics";
import { createServiceRoleClient } from "@/lib/supabase/service";

const bodySchema = z
  .object({
    social_platform: z.string().trim().optional(),
    social_username: z.string().trim().optional(),
  })
  .optional();

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

export async function POST(request: Request) {
  const supabase = await supabaseFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "kyc_status, full_name, phone, address, address_line1, address_line2, address_city, address_pin_code, handle, social_platform, social_username, follower_count"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.kyc_status === "verified") {
    return NextResponse.json({ error: "Identity already verified" }, { status: 400 });
  }
  if (profile?.kyc_status === "pending") {
    return NextResponse.json({ error: "Verification already under review" }, { status: 400 });
  }

  if (!isProfileBasicsComplete(profile)) {
    return NextResponse.json(
      { error: "Complete your profile overview (name, phone, address, followers) first." },
      { status: 400 }
    );
  }

  const handle =
    typeof profile?.handle === "string" && profile.handle.trim() ? profile.handle.trim() : null;
  if (!handle) {
    return NextResponse.json(
      { error: "Set your public Instagram handle in Settings before requesting review." },
      { status: 400 }
    );
  }

  let body: z.infer<typeof bodySchema> = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const raw = await request.json();
      const parsed = bodySchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
      body = parsed.data ?? {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    logger.error("identity_submit_misconfigured", { reason: "missing_service_role" });
    return NextResponse.json(
      { error: "Identity verification is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  const socialPlatform =
    body?.social_platform?.trim() ||
    (typeof profile?.social_platform === "string" && profile.social_platform.trim()) ||
    "instagram";
  const socialUsername =
    body?.social_username?.replace(/^@/, "").trim() ||
    handle;

  const submittedAtIso = new Date().toISOString();
  const profileUpdate = {
    social_platform: socialPlatform,
    social_username: socialUsername,
    identity_submitted_at: submittedAtIso,
    kyc_status: "pending" as const,
  };

  const { error: profileError } = await admin
    .from("profiles")
    .update(profileUpdate)
    .eq("id", user.id);

  if (profileError) {
    console.error("identity profile update:", profileError);
    return NextResponse.json({ error: "Failed to submit verification." }, { status: 500 });
  }

  try {
    await sendIdentityVerificationAdminNotification({
      userId: user.id,
      userEmail: user.email ?? null,
      fullName: profile!.full_name!.trim(),
      phone: profile!.phone!.trim(),
      address: formatProfileAddress(profile),
      socialPlatform,
      socialUsername,
      submittedAtIso,
      files: [],
      manualReview: true,
      followerCount:
        typeof profile?.follower_count === "number" ? profile.follower_count : null,
      publicProfileUrl: `/k/${handle}`,
    });
  } catch (e) {
    logger.error("identity_verification_admin_email_failed", {
      message: e instanceof Error ? e.message : String(e),
      userId: user.id,
    });
  }

  return NextResponse.json({
    success: true,
    kycStatus: "pending",
    message:
      "Thanks — our team will review your profile and public handle. We may contact you if we need anything else.",
  });
}
