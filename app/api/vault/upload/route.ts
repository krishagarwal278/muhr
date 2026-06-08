import crypto from "crypto";

import type { VaultAsset, AssetType } from "@/types";
import { requireUser } from "@/lib/auth/requireUser";
import { getFaceEmbeddingFromImageUrl } from "@/lib/embeddings/face";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isAllowedVaultAudioMime } from "@/lib/vault/audioMime";
import { vaultStorageContentType, vaultStorageFileExtension } from "@/lib/vault/uploadStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("kyc_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.kyc_status !== "verified") {
      return Response.json(
        {
          ok: false,
          error: {
            code: "kyc_required",
            message: "Complete identity verification before uploading vault assets.",
          },
        },
        { status: 403 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid form data" } },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    const assetType = formData.get("asset_type") as AssetType | null;
    const encryptionVersionRaw = formData.get("encryption_version");
    const encryptionVersion =
      typeof encryptionVersionRaw === "string" && encryptionVersionRaw ? parseInt(encryptionVersionRaw, 10) : null;
    const isEncrypted = encryptionVersion === 1;
    const originalMimeType = typeof formData.get("original_mime_type") === "string" ? String(formData.get("original_mime_type")) : "";
    const originalFileName = typeof formData.get("original_file_name") === "string" ? String(formData.get("original_file_name")) : "";
    const encryptionAlg = typeof formData.get("encryption_alg") === "string" ? String(formData.get("encryption_alg")) : "";
    const encryptionIv = typeof formData.get("encryption_iv") === "string" ? String(formData.get("encryption_iv")) : "";
    const wrappedDataKey = typeof formData.get("wrapped_data_key") === "string" ? String(formData.get("wrapped_data_key")) : "";
    const wrappedKeyIv = typeof formData.get("wrapped_key_iv") === "string" ? String(formData.get("wrapped_key_iv")) : "";
    const wrappedKeySalt = typeof formData.get("wrapped_key_salt") === "string" ? String(formData.get("wrapped_key_salt")) : "";

    if (!file) {
      return Response.json(
        { ok: false, error: { code: "missing_file", message: "No file provided" } },
        { status: 400 }
      );
    }

    if (!assetType || !["face_photo", "voice_sample", "document", "character_sheet"].includes(assetType)) {
      return Response.json(
        { ok: false, error: { code: "invalid_type", message: "Invalid asset type" } },
        { status: 400 }
      );
    }

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    
    const effectiveMimeType = isEncrypted ? originalMimeType : file.type;

    if (
      (assetType === "face_photo" || assetType === "character_sheet") &&
      !allowedImageTypes.includes(effectiveMimeType)
    ) {
      return Response.json(
        { ok: false, error: { code: "invalid_mime", message: "Invalid image type. Use JPEG, PNG, or WebP." } },
        { status: 400 }
      );
    }

    if (assetType === "voice_sample") {
      if (!isEncrypted) {
        return Response.json(
          {
            ok: false,
            error: {
              code: "encryption_required",
              message: "Voice samples must be encrypted before upload.",
            },
          },
          { status: 400 }
        );
      }
      if (!isAllowedVaultAudioMime(effectiveMimeType)) {
        return Response.json(
          {
            ok: false,
            error: {
              code: "invalid_mime",
              message: "Invalid audio type. Use MP3 or MP4 only.",
            },
          },
          { status: 400 }
        );
      }
    }

    const maxSize =
      assetType === "character_sheet"
        ? 15 * 1024 * 1024
        : assetType === "face_photo"
          ? 10 * 1024 * 1024
          : 50 * 1024 * 1024;

    if (file.size > maxSize) {
      return Response.json(
        { ok: false, error: { code: "file_too_large", message: `File too large. Max ${maxSize / 1024 / 1024}MB.` } },
        { status: 400 }
      );
    }

    const fileExt = vaultStorageFileExtension(
      assetType,
      file.name,
      originalFileName,
      isEncrypted,
      effectiveMimeType
    );
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString("hex");
    const filePath = `${user.id}/${assetType}/${timestamp}-${randomId}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hashSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    const storageContentType = vaultStorageContentType(
      assetType,
      isEncrypted,
      effectiveMimeType,
      file.type
    );

    const storageClient = createServiceRoleClient() ?? supabase;
    const { error: uploadError } = await storageClient.storage
      .from("assets")
      .upload(filePath, buffer, {
        contentType: storageContentType,
        upsert: false,
      });

    if (uploadError) {
      logger.error("vault_upload_error", {
        userId: user.id,
        assetType,
        storageContentType,
        fileExt,
        error: uploadError.message,
      });
      return Response.json(
        {
          ok: false,
          error: {
            code: "upload_failed",
            message: uploadError.message || "Failed to upload file",
          },
        },
        { status: 500 }
      );
    }

    const { data: asset, error: dbError } = await supabase
      .from("vault_assets")
      .insert({
        user_id: user.id,
        asset_type: assetType,
        file_name: originalFileName || file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: isEncrypted ? "application/octet-stream" : file.type,
        hash_sha256: hashSha256,
        ...(isEncrypted
          ? {
              encryption_key_id: "muhr-vault-pbkdf2-aesgcm-v1",
              encryption_version: 1,
              encryption_alg: encryptionAlg || "AES-256-GCM",
              encryption_iv: encryptionIv,
              wrapped_data_key: wrappedDataKey,
              wrapped_key_iv: wrappedKeyIv,
              wrapped_key_salt: wrappedKeySalt,
              original_file_name: originalFileName || file.name,
              original_mime_type: originalMimeType || effectiveMimeType,
            }
          : {}),
      })
      .select("id,user_id,asset_type,file_name,file_path,file_size,mime_type,hash_sha256,created_at,updated_at")
      .single();

    if (dbError) {
      logger.error("vault_db_insert_error", { userId: user.id, code: dbError.code });
      await supabase.storage.from("assets").remove([filePath]);
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to save asset record" } },
        { status: 500 }
      );
    }

    if (assetType === "face_photo" && !isEncrypted) {
      try {
        const { data: signed } = await supabase.storage
          .from("assets")
          .createSignedUrl(filePath, 60 * 5);

        const signedUrl = signed?.signedUrl;
        if (signedUrl) {
          const emb = await getFaceEmbeddingFromImageUrl(signedUrl);
          const admin = createServiceRoleClient();
          if (admin) {
            if (emb.ok) {
              await admin
                .from("vault_assets")
                .update({
                  face_embedding: emb.embedding,
                  face_embedding_status: "ready",
                  face_embedding_model: emb.model ?? "unknown",
                  face_embedding_error: null,
                  face_embedding_created_at: new Date().toISOString(),
                })
                .eq("id", asset.id)
                .eq("user_id", user.id);
            } else {
              await admin
                .from("vault_assets")
                .update({
                  face_embedding_status: "failed",
                  face_embedding_error: emb.error,
                  face_embedding_created_at: new Date().toISOString(),
                })
                .eq("id", asset.id)
                .eq("user_id", user.id);
            }
          }
        }
      } catch (e) {
        logger.warn("face_embedding_error", { assetId: asset.id, error: String(e) });
      }
    }

    return Response.json({
      ok: true,
      data: {
        message: "Asset uploaded successfully",
        asset: asset as VaultAsset,
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
