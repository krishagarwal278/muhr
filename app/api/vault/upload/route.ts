import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { VaultAsset, UploadResponse, AssetType } from "@/types";
import crypto from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getFaceEmbeddingFromImageUrl } from "@/lib/embeddings/face";

export async function POST(request: Request) {
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
    return NextResponse.json<UploadResponse>(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("kyc_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.kyc_status !== "verified") {
    return NextResponse.json<UploadResponse>(
      {
        success: false,
        message: "Complete identity verification before uploading vault assets.",
      },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
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
      return NextResponse.json<UploadResponse>(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    if (!assetType || !["face_photo", "voice_sample", "document"].includes(assetType)) {
      return NextResponse.json<UploadResponse>(
        { success: false, message: "Invalid asset type" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    const allowedAudioTypes = ["audio/mpeg", "audio/wav", "audio/mp4"];
    
    const effectiveMimeType = isEncrypted ? originalMimeType : file.type;

    if (assetType === "face_photo" && !allowedImageTypes.includes(effectiveMimeType)) {
      return NextResponse.json<UploadResponse>(
        { success: false, message: "Invalid image type. Use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }

    if (assetType === "voice_sample" && !allowedAudioTypes.includes(effectiveMimeType)) {
      return NextResponse.json<UploadResponse>(
        { success: false, message: "Invalid audio type. Use MP3, WAV, or M4A." },
        { status: 400 }
      );
    }

    // File size limit: 10MB for images, 50MB for audio
    const maxSize = assetType === "face_photo" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json<UploadResponse>(
        { success: false, message: `File too large. Max ${maxSize / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    // Generate unique file path
    const fileExt = file.name.split(".").pop();
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString("hex");
    const filePath = `${user.id}/${assetType}/${timestamp}-${randomId}.${fileExt}`;

    // Calculate file hash
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hashSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(filePath, buffer, {
        contentType: effectiveMimeType || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json<UploadResponse>(
        { success: false, message: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Save asset record to database
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
      // Only select columns guaranteed to exist in current DB schema.
      // (Security + embedding metadata columns are optional migrations.)
      .select("id,user_id,asset_type,file_name,file_path,file_size,mime_type,hash_sha256,created_at,updated_at")
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Try to clean up the uploaded file
      await supabase.storage.from("assets").remove([filePath]);
      return NextResponse.json<UploadResponse>(
        { success: false, message: "Failed to save asset record" },
        { status: 500 }
      );
    }

    // Phase 1: compute and store a face embedding at upload time.
    // This is server-only; we update via service role so clients can't spoof embeddings.
    if (assetType === "face_photo" && !isEncrypted) {
      try {
        const { data: signed } = await supabase.storage
          .from("assets")
          .createSignedUrl(filePath, 60 * 5); // 5 min

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
        console.error("Face embedding error:", e);
      }
    }

    return NextResponse.json<UploadResponse>({
      success: true,
      message: "Asset uploaded successfully",
      asset: asset as VaultAsset,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json<UploadResponse>(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
