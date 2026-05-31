import {
  BRAND_PROFILE_MIGRATION_HINT,
  mapBrandProfileFromDb,
  mapBrandProfileToDb,
  type BrandVerificationDocument,
  validateBrandProfile,
  type BrandProfileValues,
} from "@/lib/brand/profile";
import { requireBrandUser } from "@/lib/brand/requireBrandUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMissingBrandProfilesTable(message: string): boolean {
  return message.includes("brand_profiles") && message.includes("schema cache");
}

async function loadDocuments(
  supabase: Awaited<ReturnType<typeof createRouteClient>>,
  userId: string
): Promise<BrandVerificationDocument[]> {
  const { data, error } = await supabase
    .from("brand_verification_documents")
    .select("id, document_type, file_name, mime_type, file_size, file_path, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message.includes("brand_verification_documents")) return [];
    throw error;
  }

  const rows = data ?? [];
  const documents: BrandVerificationDocument[] = [];

  for (const row of rows) {
    const { data: signed } = await supabase.storage
      .from("assets")
      .createSignedUrl(row.file_path, 60 * 30);

    documents.push({
      id: row.id,
      documentType: row.document_type,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      createdAt: row.created_at,
      downloadUrl: signed?.signedUrl ?? null,
    });
  }

  return documents;
}

export async function GET() {
  try {
    const user = await requireBrandUser();
    const supabase = await createRouteClient();

    const { data, error } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      logger.error("brand_profile_get_error", { userId: user.id, message: error.message });
      if (isMissingBrandProfilesTable(error.message)) {
        return Response.json(
          {
            ok: false,
            error: { code: "migration_required", message: BRAND_PROFILE_MIGRATION_HINT },
          },
          { status: 503 }
        );
      }
      return Response.json(
        { ok: false, error: { code: "db", message: "Failed to load profile" } },
        { status: 500 }
      );
    }

    const documents = await loadDocuments(supabase, user.id);

    return Response.json({
      ok: true,
      data: {
        profile: mapBrandProfileFromDb(data),
        documents,
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireBrandUser();
    const supabase = await createRouteClient();
    const body = (await request.json()) as BrandProfileValues;

    const validationError = validateBrandProfile(body);
    if (validationError) {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: validationError } },
        { status: 400 }
      );
    }

    const upsertRow = {
      user_id: user.id,
      ...mapBrandProfileToDb(body),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("brand_profiles")
      .upsert(upsertRow, { onConflict: "user_id" });

    if (error) {
      logger.error("brand_profile_patch_error", { userId: user.id, message: error.message });
      if (isMissingBrandProfilesTable(error.message)) {
        return Response.json(
          {
            ok: false,
            error: { code: "migration_required", message: BRAND_PROFILE_MIGRATION_HINT },
          },
          { status: 503 }
        );
      }
      return Response.json(
        { ok: false, error: { code: "db", message: "Could not save profile" } },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, data: { profile: mapBrandProfileFromDb(upsertRow) } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
