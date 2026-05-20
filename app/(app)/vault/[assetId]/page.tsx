import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DeleteAssetButton } from "../../../../components/vault/DeleteAssetButton";
import { CharacterSheetExport } from "@/components/vault/CharacterSheetExport";
import { DecryptedFacePhoto } from "@/components/vault/DecryptedFacePhoto";

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
              <Image
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
                    ? "Character sheet (encrypted)"
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

            <div className="flex gap-3 pt-2">
              {asset.asset_type !== "character_sheet" && (
                <a
                  href={asset.signed_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg border border-black/15 bg-white py-2.5 text-center text-sm font-medium text-neutral-950 transition hover:bg-neutral-50"
                >
                  View full size
                </a>
              )}
              <DeleteAssetButton assetId={asset.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
