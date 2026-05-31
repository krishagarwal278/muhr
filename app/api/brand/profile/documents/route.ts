import { randomUUID } from "crypto";
import {
  BRAND_PROFILE_MIGRATION_HINT,
  BRAND_VERIFICATION_MAX_BYTES,
  brandVerificationStoragePath,
  isBrandVerificationDocumentType,
  isBrandVerificationMime,
  type BrandVerificationDocument,
} from "@/lib/brand/profile";
import { requireBrandUser } from "@/lib/brand/requireBrandUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireBrandUser();
    const supabase = await createRouteClient();

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid form data" } },
        { status: 400 }
      );
    }

    const documentType = String(formData.get("documentType") ?? "");
    const file = formData.get("file");

    if (!isBrandVerificationDocumentType(documentType)) {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Unknown document type" } },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return Response.json(
        { ok: false, error: { code: "missing_file", message: "Choose a file to upload" } },
        { status: 400 }
      );
    }

    const mime = file.type || "application/octet-stream";
    if (!isBrandVerificationMime(mime)) {
      return Response.json(
        { ok: false, error: { code: "invalid_type", message: "Use PDF, JPEG, or PNG" } },
        { status: 400 }
      );
    }

    if (file.size > BRAND_VERIFICATION_MAX_BYTES) {
      return Response.json(
        { ok: false, error: { code: "file_too_large", message: "File must be 10MB or smaller" } },
        { status: 400 }
      );
    }

    const documentId = randomUUID();
    const filePath = brandVerificationStoragePath(user.id, documentId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from("assets").upload(filePath, buffer, {
      contentType: mime,
      upsert: false,
    });

    if (uploadError) {
      logger.error("brand_verification_upload_error", { userId: user.id, message: uploadError.message });
      const mimeRejected =
        uploadError.message.includes("mime type") && uploadError.message.includes("not supported");
      return Response.json(
        {
          ok: false,
          error: {
            code: mimeRejected ? "storage_mime_not_allowed" : "upload_failed",
            message: mimeRejected
              ? "PDF uploads are not enabled on storage. Run migration 033_brand_verification_pdf_storage.sql on your Supabase project."
              : "Could not upload document",
          },
        },
        { status: mimeRejected ? 503 : 500 }
      );
    }

    const { data: row, error: insertError } = await supabase
      .from("brand_verification_documents")
      .insert({
        id: documentId,
        user_id: user.id,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        mime_type: mime,
        file_size: file.size,
      })
      .select("id, document_type, file_name, mime_type, file_size, file_path, created_at")
      .single();

    if (insertError) {
      await supabase.storage.from("assets").remove([filePath]);
      logger.error("brand_verification_insert_error", { userId: user.id, message: insertError.message });
      if (insertError.message.includes("brand_verification_documents")) {
        return Response.json(
          {
            ok: false,
            error: { code: "migration_required", message: BRAND_PROFILE_MIGRATION_HINT },
          },
          { status: 503 }
        );
      }
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Could not save document record" } },
        { status: 500 }
      );
    }

    const { data: signed } = await supabase.storage.from("assets").createSignedUrl(filePath, 60 * 30);

    const document: BrandVerificationDocument = {
      id: row.id,
      documentType: row.document_type,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      createdAt: row.created_at,
      downloadUrl: signed?.signedUrl ?? null,
    };

    return Response.json({ ok: true, data: { document } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
