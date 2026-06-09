import { z } from "zod";

import { requireUser } from "@/lib/auth/requireUser";
import { sendIdentityVerificationAdminNotification } from "@/lib/email/sendIdentityVerificationAdminNotification";
import { RateLimitError, toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { signIdentityVerificationFiles } from "@/lib/identity/signedVerificationFileUrls";
import { formatProfileAddress } from "@/lib/profile/basics";
import { MIN_CHARACTER_PHOTOS } from "@/lib/profile/completion";
import {
  countCharacterPhotos,
  hasRequiredCharacterPhotosForVerification,
} from "@/lib/profile/identityVerification";
import { rateLimit } from "@/lib/ratelimit";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    social_platform: z.string().trim().optional(),
    social_username: z.string().trim().optional(),
  })
  .optional();

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    
    await rateLimit({
      key: "identity_submit",
      identifier: user.id,
      limit: 10,
      window: "1h",
    });
    
    const supabase = await createRouteClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "kyc_status, full_name, phone, address, address_line1, address_line2, address_city, address_pin_code, handle, social_platform, social_username, follower_count"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.kyc_status === "verified") {
      return Response.json(
        { ok: false, error: { code: "already_verified", message: "Identity already verified" } },
        { status: 400 }
      );
    }
    if (profile?.kyc_status === "pending") {
      return Response.json(
        { ok: false, error: { code: "already_pending", message: "Verification already under review" } },
        { status: 400 }
      );
    }

    const characterPhotoCount = await countCharacterPhotos(supabase, user.id);
    if (!hasRequiredCharacterPhotosForVerification(characterPhotoCount)) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "missing_character_photos",
            message: `Upload ${MIN_CHARACTER_PHOTOS} character photos in Profile before submitting for review.`,
          },
        },
        { status: 400 }
      );
    }

    const handle =
      typeof profile?.handle === "string" && profile.handle.trim() ? profile.handle.trim() : null;
    if (!handle) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "missing_handle",
            message: "Set your Muhr handle in Profile before requesting review.",
          },
        },
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
          return Response.json(
            { ok: false, error: { code: "invalid_input", message: "Invalid request body" } },
            { status: 400 }
          );
        }
        body = parsed.data ?? {};
      } catch {
        return Response.json(
          { ok: false, error: { code: "invalid_json", message: "Invalid JSON" } },
          { status: 400 }
        );
      }
    }

    const admin = createServiceRoleClient();
    if (!admin) {
      logger.error("identity_submit_misconfigured", { reason: "missing_service_role" });
      return Response.json(
        {
          ok: false,
          error: {
            code: "unavailable",
            message: "Identity verification is temporarily unavailable. Please try again later.",
          },
        },
        { status: 503 }
      );
    }

    const socialPlatform =
      body?.social_platform?.trim() ||
      (typeof profile?.social_platform === "string" && profile.social_platform.trim()) ||
      "instagram";
    const socialUsername = body?.social_username?.replace(/^@/, "").trim() || handle;

    const submittedAtIso = new Date().toISOString();
    const profileUpdate = {
      social_platform: socialPlatform,
      social_username: socialUsername,
      identity_submitted_at: submittedAtIso,
      kyc_status: "pending" as const,
    };

    const { data: photoRows } = await admin
      .from("character_photos")
      .select("file_path, file_name, slot_index")
      .eq("user_id", user.id)
      .order("slot_index", { ascending: true })
      .order("created_at", { ascending: true });

    const signedPhotoFiles = await signIdentityVerificationFiles(
      admin,
      (photoRows ?? []).map((photo, index) => ({
        file_kind: `character_photo_${(photo.slot_index ?? index) + 1}`,
        file_path: photo.file_path,
        file_name: photo.file_name,
      }))
    );

    const { error: profileError } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id);

    if (profileError) {
      logger.error("identity_submit_profile_update", { userId: user.id, code: profileError.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to submit verification." } },
        { status: 500 }
      );
    }

    try {
      await sendIdentityVerificationAdminNotification({
        userId: user.id,
        userEmail: user.email ?? null,
        fullName:
          (typeof profile?.full_name === "string" && profile.full_name.trim()) ||
          user.email?.split("@")[0] ||
          "Creator",
        phone: (typeof profile?.phone === "string" && profile.phone.trim()) || "—",
        address: formatProfileAddress(profile),
        socialPlatform,
        socialUsername,
        submittedAtIso,
        files: signedPhotoFiles,
        manualReview: signedPhotoFiles.length === 0,
        followerCount: typeof profile?.follower_count === "number" ? profile.follower_count : null,
        publicProfileUrl: `/k/${handle}`,
      });
    } catch (e) {
      logger.error("identity_verification_admin_email_failed", {
        message: e instanceof Error ? e.message : String(e),
        userId: user.id,
      });
    }

    return Response.json({
      ok: true,
      data: {
        kycStatus: "pending",
        message:
          "Thanks — our team will review your character photos and public profile. We may contact you if we need anything else.",
      },
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return Response.json(
        { ok: false, error: { code: "rate_limited", message: err.message } },
        { status: 429 }
      );
    }
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
