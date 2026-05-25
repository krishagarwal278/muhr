import type { SupabaseClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import {
  buildAddressDbFields,
  formatProfileAddress,
  isProfileBasicsComplete,
  isProfileBasicsPatch,
  isValidPhoneE164,
  normalizePhoneE164,
  validateAddressInput,
  validateProfileBasicsInput,
} from "@/lib/profile/basics";
import { normalizeHandle, validateHandle } from "@/lib/profile/handle";
import { muidFromUserId } from "@/lib/profile/muid";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRow = {
  handle: string | null;
  display_name: string | null;
  accepting_requests: boolean | null;
  licensing_notes: string | null;
  min_license_fee_inr?: number | null;
  follower_count?: number | null;
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_city?: string | null;
  address_pin_code?: string | null;
  platform_license_signed?: boolean | null;
};

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  const msg = error.message?.toLowerCase() ?? "";
  return (
    msg.includes("follower_count") ||
    msg.includes("min_license_fee_inr") ||
    msg.includes("full_name") ||
    msg.includes("phone") ||
    msg.includes("address") ||
    msg.includes("address_line1") ||
    msg.includes("address_city") ||
    msg.includes("address_pin_code")
  );
}

function profileJsonFromRow(
  profile: ProfileRow | null,
  userId: string,
  email: string | null | undefined
) {
  return {
    handle: profile?.handle ?? null,
    displayName: profile?.display_name ?? null,
    acceptingRequests: profile?.accepting_requests ?? true,
    licensingNotes: typeof profile?.licensing_notes === "string" ? profile.licensing_notes : "",
    minLicenseFeeInr:
      typeof profile?.min_license_fee_inr === "number" && profile.min_license_fee_inr > 0
        ? profile.min_license_fee_inr
        : null,
    followerCount:
      typeof profile?.follower_count === "number" && profile.follower_count > 0
        ? profile.follower_count
        : null,
    fullName:
      typeof profile?.full_name === "string" && profile.full_name.trim()
        ? profile.full_name.trim()
        : null,
    phone:
      typeof profile?.phone === "string" && profile.phone.trim() ? profile.phone.trim() : null,
    address: formatProfileAddress(profile) || null,
    addressLine1:
      typeof profile?.address_line1 === "string" && profile.address_line1.trim()
        ? profile.address_line1.trim()
        : null,
    addressLine2:
      typeof profile?.address_line2 === "string" && profile.address_line2.trim()
        ? profile.address_line2.trim()
        : null,
    addressCity:
      typeof profile?.address_city === "string" && profile.address_city.trim()
        ? profile.address_city.trim()
        : null,
    addressPinCode:
      typeof profile?.address_pin_code === "string" && profile.address_pin_code.trim()
        ? profile.address_pin_code.trim()
        : null,
    platformLicenseSigned: profile?.platform_license_signed === true,
    profileBasicsComplete: isProfileBasicsComplete(profile),
    muid: muidFromUserId(userId),
    email: email ?? null,
  };
}

async function loadProfileRow(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: ProfileRow | null; error: { code?: string; message?: string } | null }> {
  const full = await supabase
    .from("profiles")
    .select(
      "handle, display_name, accepting_requests, licensing_notes, min_license_fee_inr, follower_count, full_name, phone, address, address_line1, address_line2, address_city, address_pin_code, platform_license_signed"
    )
    .eq("id", userId)
    .maybeSingle();

  if (!full.error) {
    return { data: full.data as ProfileRow | null, error: null };
  }
  if (!isMissingColumnError(full.error)) {
    return { data: null, error: full.error };
  }

  const withFollowers = await supabase
    .from("profiles")
    .select(
      "handle, display_name, accepting_requests, licensing_notes, min_license_fee_inr, follower_count"
    )
    .eq("id", userId)
    .maybeSingle();

  if (!withFollowers.error) {
    return { data: withFollowers.data as ProfileRow | null, error: null };
  }
  if (!isMissingColumnError(withFollowers.error)) {
    return { data: null, error: withFollowers.error };
  }

  const fallback = await supabase
    .from("profiles")
    .select("handle, display_name, accepting_requests, licensing_notes")
    .eq("id", userId)
    .maybeSingle();

  return {
    data: fallback.data as ProfileRow | null,
    error: fallback.error,
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data: profile, error } = await loadProfileRow(supabase, user.id);

    if (error) {
      logger.error("profile_get_error", { userId: user.id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to load profile" } },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      data: profileJsonFromRow(profile, user.id, user.email),
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_json", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const updates: {
      handle?: string | null;
      display_name?: string;
      accepting_requests?: boolean;
      licensing_notes?: string | null;
      follower_count?: number | null;
      full_name?: string;
      phone?: string;
      address?: string;
      address_line1?: string;
      address_line2?: string | null;
      address_city?: string;
      address_pin_code?: string;
    } = {};

    if ("handle" in body) {
      const raw = body.handle;
      if (raw === null || raw === "") {
        updates.handle = null;
      } else if (typeof raw === "string") {
        const err = validateHandle(raw);
        if (err) {
          return Response.json(
            { ok: false, error: { code: "invalid_handle", message: err } },
            { status: 400 }
          );
        }
        updates.handle = normalizeHandle(raw);
      } else {
        return Response.json(
          { ok: false, error: { code: "invalid_handle", message: "Invalid handle" } },
          { status: 400 }
        );
      }
    }

    if ("displayName" in body) {
      const v = body.displayName;
      if (v === null || v === "") updates.display_name = "";
      else if (typeof v === "string") {
        const t = v.trim().slice(0, 120);
        updates.display_name = t;
      } else {
        return Response.json(
          { ok: false, error: { code: "invalid_input", message: "Invalid displayName" } },
          { status: 400 }
        );
      }
    }

    if ("acceptingRequests" in body) {
      if (typeof body.acceptingRequests !== "boolean") {
        return Response.json(
          { ok: false, error: { code: "invalid_input", message: "acceptingRequests must be boolean" } },
          { status: 400 }
        );
      }
      updates.accepting_requests = body.acceptingRequests;
    }

    if ("followerCount" in body) {
      const v = body.followerCount;
      const basicsSave = isProfileBasicsPatch(body);
      if (v === null || v === "") {
        if (basicsSave) {
          return Response.json(
            { ok: false, error: { code: "validation_error", message: "Follower count is required." } },
            { status: 400 }
          );
        }
        updates.follower_count = null;
      } else if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        updates.follower_count = Math.min(Math.round(v), 500_000_000);
      } else {
        return Response.json(
          {
            ok: false,
            error: {
              code: "validation_error",
              message: basicsSave ? "Follower count is required." : "followerCount must be a positive number",
            },
          },
          { status: 400 }
        );
      }
    }

    if ("fullName" in body) {
      const v = body.fullName;
      if (v === null || v === "") {
        return Response.json(
          { ok: false, error: { code: "validation_error", message: "fullName cannot be empty" } },
          { status: 400 }
        );
      }
      if (typeof v !== "string") {
        return Response.json(
          { ok: false, error: { code: "invalid_input", message: "Invalid fullName" } },
          { status: 400 }
        );
      }
      const t = v.trim().slice(0, 120);
      if (!t) {
        return Response.json(
          { ok: false, error: { code: "validation_error", message: "fullName cannot be empty" } },
          { status: 400 }
        );
      }
      updates.full_name = t;
      updates.display_name = t;
    }

    if ("phone" in body) {
      const v = body.phone;
      if (typeof v !== "string") {
        return Response.json(
          { ok: false, error: { code: "invalid_input", message: "Invalid phone" } },
          { status: 400 }
        );
      }
      if (!v.trim()) {
        return Response.json(
          { ok: false, error: { code: "validation_error", message: "Phone number is required." } },
          { status: 400 }
        );
      }
      const normalized = normalizePhoneE164(v);
      if (!normalized || !isValidPhoneE164(normalized)) {
        return Response.json(
          { ok: false, error: { code: "validation_error", message: "Enter a valid phone number with country code." } },
          { status: 400 }
        );
      }
      updates.phone = normalized;
    }

    const hasStructuredAddress =
      "addressLine1" in body ||
      "addressLine2" in body ||
      "addressCity" in body ||
      "addressPinCode" in body;

    if (hasStructuredAddress) {
      const addressLine1 = typeof body.addressLine1 === "string" ? body.addressLine1 : "";
      const addressLine2 = typeof body.addressLine2 === "string" ? body.addressLine2 : "";
      const addressCity = typeof body.addressCity === "string" ? body.addressCity : "";
      const addressPinCode = typeof body.addressPinCode === "string" ? body.addressPinCode : "";
      const addressError = validateAddressInput({
        addressLine1,
        addressLine2,
        addressCity,
        addressPinCode,
      });
      if (addressError) {
        return Response.json(
          { ok: false, error: { code: "validation_error", message: addressError } },
          { status: 400 }
        );
      }
      Object.assign(
        updates,
        buildAddressDbFields({
          addressLine1,
          addressLine2,
          addressCity,
          addressPinCode,
        })
      );
    } else if ("address" in body) {
      const v = body.address;
      if (typeof v !== "string") {
        return Response.json(
          { ok: false, error: { code: "invalid_input", message: "Invalid address" } },
          { status: 400 }
        );
      }
      const t = v.trim();
      if (t.length < 3) {
        return Response.json(
          { ok: false, error: { code: "validation_error", message: "Address is required." } },
          { status: 400 }
        );
      }
      if (t.length > 500) {
        return Response.json(
          { ok: false, error: { code: "validation_error", message: "Address must be at most 500 characters." } },
          { status: 400 }
        );
      }
      updates.address = t;
    }

    if (isProfileBasicsPatch(body)) {
      const fullName = typeof body.fullName === "string" ? body.fullName : "";
      const phone = typeof body.phone === "string" ? body.phone : "";
      const addressLine1 = typeof body.addressLine1 === "string" ? body.addressLine1 : "";
      const addressLine2 = typeof body.addressLine2 === "string" ? body.addressLine2 : "";
      const addressCity = typeof body.addressCity === "string" ? body.addressCity : "";
      const addressPinCode = typeof body.addressPinCode === "string" ? body.addressPinCode : "";
      const followerCount =
        typeof body.followerCount === "number" && Number.isFinite(body.followerCount)
          ? body.followerCount
          : 0;
      const normalizedPhone = normalizePhoneE164(phone.trim()) ?? phone.trim();
      const basicsError = validateProfileBasicsInput({
        fullName,
        phone: normalizedPhone,
        addressLine1,
        addressLine2,
        addressCity,
        addressPinCode,
        followerCount,
      });
      if (basicsError) {
        return Response.json(
          { ok: false, error: { code: "validation_error", message: basicsError } },
          { status: 400 }
        );
      }
    }

    if ("licensingNotes" in body) {
      const v = body.licensingNotes;
      if (v === null || v === "") {
        updates.licensing_notes = null;
      } else if (typeof v === "string") {
        const t = v.trim();
        if (t.length > 4000) {
          return Response.json(
            { ok: false, error: { code: "validation_error", message: "Licensing notes must be at most 4000 characters" } },
            { status: 400 }
          );
        }
        updates.licensing_notes = t.length ? t : null;
      } else {
        return Response.json(
          { ok: false, error: { code: "invalid_input", message: "Invalid licensingNotes" } },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { ok: false, error: { code: "no_changes", message: "No valid fields" } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select(
        "handle, display_name, accepting_requests, licensing_notes, min_license_fee_inr, follower_count, full_name, phone, address, address_line1, address_line2, address_city, address_pin_code, platform_license_signed"
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json(
          { ok: false, error: { code: "conflict", message: "That handle is already taken." } },
          { status: 409 }
        );
      }
      if (
        isMissingColumnError(error) &&
        ("follower_count" in updates ||
          "full_name" in updates ||
          "phone" in updates ||
          "address" in updates ||
          "address_line1" in updates ||
          "address_city" in updates ||
          "address_pin_code" in updates)
      ) {
        logger.error("profile_patch_missing_column", { userId: user.id, code: error.code });
        return Response.json(
          {
            ok: false,
            error: {
              code: "unavailable",
              message: "Follower count cannot be saved until the latest database migration is applied.",
            },
          },
          { status: 503 }
        );
      }
      logger.error("profile_patch_error", { userId: user.id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Could not save profile" } },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      data: profileJsonFromRow(data as ProfileRow | null, user.id, user.email),
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
