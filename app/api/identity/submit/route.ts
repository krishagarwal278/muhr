import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

import { sendIdentityVerificationAdminNotification } from "@/lib/email/sendIdentityVerificationAdminNotification";
import { signIdentityVerificationFiles } from "@/lib/identity/signedVerificationFileUrls";
import { logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { IdentityVerificationFileKind } from "@/types";

const FILE_KINDS: IdentityVerificationFileKind[] = [
  "liveness_front",
  "liveness_left",
  "liveness_right",
  "social_followers",
  "social_age",
  "social_location",
];

const bodySchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(40),
  address: z.string().trim().min(3).max(500),
  social_platform: z.string().trim().default("instagram"),
  social_username: z.string().trim().min(1).max(80),
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

export async function POST(request: Request) {
  const supabase = await supabaseFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("kyc_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.kyc_status === "verified") {
    return NextResponse.json({ error: "Identity already verified" }, { status: 400 });
  }
  if (profile?.kyc_status === "pending") {
    return NextResponse.json({ error: "Verification already under review" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    social_platform: formData.get("social_platform") ?? "instagram",
    social_username: formData.get("social_username"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete all personal and social details." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    logger.error("identity_submit_misconfigured", { reason: "missing_service_role" });
    return NextResponse.json(
      { error: "Identity verification is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  const uploadedFiles: { file_kind: string; file_path: string; file_name: string }[] = [];

  for (const kind of FILE_KINDS) {
    const file = formData.get(kind);
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: `Missing upload: ${kind.replace(/_/g, " ")}` }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "All uploads must be images." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Each image must be under 10MB." }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${user.id}/identity-verification/${kind}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from("assets").upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });
    if (uploadError) {
      console.error("identity upload:", uploadError);
      return NextResponse.json({ error: "Failed to upload verification files." }, { status: 500 });
    }

    const { error: rowError } = await supabase.from("identity_verification_files").upsert(
      {
        user_id: user.id,
        file_kind: kind,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      },
      { onConflict: "user_id,file_kind" }
    );
    if (rowError) {
      console.error("identity file row:", rowError);
      return NextResponse.json({ error: "Failed to save verification record." }, { status: 500 });
    }

    uploadedFiles.push({ file_kind: kind, file_path: filePath, file_name: file.name });
  }

  const details = parsed.data;
  const profileUpdate = {
    full_name: details.full_name,
    phone: details.phone,
    address: details.address,
    social_platform: details.social_platform,
    social_username: details.social_username.replace(/^@/, ""),
    identity_submitted_at: new Date().toISOString(),
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

  const submittedAtIso = profileUpdate.identity_submitted_at;
  try {
    const filesWithUrls = await signIdentityVerificationFiles(admin, uploadedFiles);
    await sendIdentityVerificationAdminNotification({
      userId: user.id,
      userEmail: user.email ?? null,
      fullName: details.full_name,
      phone: details.phone,
      address: details.address,
      socialPlatform: details.social_platform,
      socialUsername: profileUpdate.social_username,
      submittedAtIso,
      files: filesWithUrls,
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
    message: "Your profile is being verified. We'll email you within 24 hours.",
  });
}
