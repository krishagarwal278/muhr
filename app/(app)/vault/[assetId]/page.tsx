import Link from "next/link";
import { notFound } from "next/navigation";
import { SignedStorageImage } from "@/components/ui/SignedStorageImage";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { VaultAssetActions } from "@/components/vault/VaultAssetActions";
import { CharacterSheetExport } from "@/components/vault/CharacterSheetExport";
import { DecryptedFacePhoto } from "@/components/vault/DecryptedFacePhoto";
import { DecryptedVoiceSample } from "@/components/vault/DecryptedVoiceSample";

async function getAsset(assetId: string) {
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: asset } = await supabase
    .from("vault_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .single();

  if (!asset) return null;

  const { data: signedUrl } = await supabase.storage
    .from("assets")
    .createSignedUrl(asset.file_path, 3600);

  return {
    ...asset,
    signed_url: signedUrl?.signedUrl || null,
  };
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;

  if (!assetId) {
    notFound();
  }

  const asset = await getAsset(assetId);

  if (!asset) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/vault"
          className="inline-flex items-center gap-1 text-sm text-neutral-900/55 hover:text-neutral-950"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Vault
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          {/* Image */}
          {asset.signed_url && asset.asset_type === "face_photo" && !asset.encryption_key_id && (
            <div className="relative aspect-square w-full bg-black">
              <SignedStorageImage
                src={asset.signed_url}
                alt={asset.file_name}
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-contain"
              />
            </div>
          )}

          {asset.signed_url && asset.asset_type === "face_photo" && asset.encryption_key_id && (
            <DecryptedFacePhoto
              signedUrl={asset.signed_url}
              meta={{
                encryption_version: 1,
                encryption_alg: "AES-256-GCM",
                encryption_iv_b64: asset.encryption_iv,
                wrapped_data_key_b64: asset.wrapped_data_key,
                wrapped_key_iv_b64: asset.wrapped_key_iv,
                wrapped_key_salt_b64: asset.wrapped_key_salt,
                original_file_name: asset.original_file_name ?? asset.file_name,
                original_mime_type: asset.original_mime_type ?? "application/octet-stream",
              }}
            />
          )}

          {asset.signed_url && asset.asset_type === "character_sheet" && !asset.encryption_key_id && (
            <div className="relative aspect-[4/3] w-full bg-neutral-950">
              <SignedStorageImage
                src={asset.signed_url}
                alt={asset.file_name}
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-contain"
              />
            </div>
          )}

          {asset.signed_url && asset.asset_type === "voice_sample" && asset.encryption_key_id && (
            <DecryptedVoiceSample
              signedUrl={asset.signed_url}
              meta={{
                encryption_version: 1,
                encryption_alg: "AES-256-GCM",
                encryption_iv_b64: asset.encryption_iv,
                wrapped_data_key_b64: asset.wrapped_data_key,
                wrapped_key_iv_b64: asset.wrapped_key_iv,
                wrapped_key_salt_b64: asset.wrapped_key_salt,
                original_file_name: asset.original_file_name ?? asset.file_name,
                original_mime_type: asset.original_mime_type ?? "audio/webm",
              }}
            />
          )}

          {asset.signed_url && asset.asset_type === "voice_sample" && !asset.encryption_key_id && (
            <div className="border-b border-black/10 bg-neutral-950 px-4 py-8">
              <audio src={asset.signed_url} controls className="w-full" />
            </div>
          )}

          {asset.signed_url && asset.asset_type === "character_sheet" && asset.encryption_key_id && (
            <div className="relative aspect-[4/3] w-full bg-neutral-950">
              <DecryptedFacePhoto
                signedUrl={asset.signed_url}
                meta={{
                  encryption_version: 1,
                  encryption_alg: "AES-256-GCM",
                  encryption_iv_b64: asset.encryption_iv,
                  wrapped_data_key_b64: asset.wrapped_data_key,
                  wrapped_key_iv_b64: asset.wrapped_key_iv,
                  wrapped_key_salt_b64: asset.wrapped_key_salt,
                  original_file_name: asset.original_file_name ?? asset.file_name,
                  original_mime_type: asset.original_mime_type ?? "image/png",
                }}
              />
            </div>
          )}

          {/* Document preview */}
          {asset.asset_type === "document" && (
            <div className="flex flex-col items-center justify-center border-b border-black/10 bg-neutral-100 py-12">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                <svg className="h-8 w-8 text-neutral-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-900">{asset.original_file_name ?? asset.file_name}</p>
              <p className="mt-1 text-xs text-neutral-500">{formatFileSize(asset.file_size)}</p>
              {asset.encryption_key_id 
              && (
                <div className="mt-3 flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  Encrypted
                </div>
              )
              }
            </div>
          )}

          {/* Details */}
          <div className="space-y-4 p-6">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Asset Details</h1>
              <p className="mt-1 text-sm text-neutral-900/55">
                Uploaded on {formatDate(asset.created_at)}
              </p>
            </div>

            <div className="space-y-3 rounded-xl bg-neutral-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-900/55">Asset ID</span>
                <code className="rounded bg-black/5 px-2 py-1 font-mono text-xs text-neutral-950">
                  {asset.id}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-900/55">Short ID</span>
                <code className="rounded bg-black/5 px-2 py-1 font-mono text-xs text-neutral-950">
                  {asset.id.substring(0, 8).toUpperCase()}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-900/55">Type</span>
                <span className="text-sm capitalize">
                  {asset.asset_type === "character_sheet"
                    ? asset.encryption_key_id
                      ? "Character sheet (legacy encrypted)"
                      : "Character sheet"
                    : asset.asset_type.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-900/55">File name</span>
                <span className="max-w-[200px] truncate text-sm">{asset.file_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-900/55">File size</span>
                <span className="text-sm">{formatFileSize(asset.file_size)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-900/55">Format</span>
                <span className="text-sm">{asset.mime_type}</span>
              </div>
              {asset.hash_sha256 && (
                <div className="flex items-start justify-between gap-4">
                  <span className="shrink-0 text-sm text-neutral-900/55">SHA-256</span>
                  <code className="break-all rounded bg-black/5 px-2 py-1 font-mono text-[10px] text-neutral-900/80">
                    {asset.hash_sha256}
                  </code>
                </div>
              )}
            </div>

            {asset.asset_type === "character_sheet" && asset.encryption_key_id && asset.signed_url && (
              <CharacterSheetExport
                signedUrl={asset.signed_url}
                meta={{
                  encryption_version: 1,
                  encryption_alg: "AES-256-GCM",
                  encryption_iv_b64: asset.encryption_iv,
                  wrapped_data_key_b64: asset.wrapped_data_key,
                  wrapped_key_iv_b64: asset.wrapped_key_iv,
                  wrapped_key_salt_b64: asset.wrapped_key_salt,
                  original_file_name: asset.original_file_name ?? asset.file_name,
                  original_mime_type: asset.original_mime_type ?? "image/png",
                }}
                displayFileName="muhr-character-sheet.png"
              />
            )}

            <VaultAssetActions asset={asset} />
          </div>
        </div>
      </div>
    </div>
  );
}
