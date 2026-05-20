import type { SupabaseClient } from "@supabase/supabase-js";

/** 7 days — long enough for manual review from email links. */
export const IDENTITY_REVIEW_SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

export type VerificationFileWithUrl = {
  file_kind: string;
  file_path: string;
  file_name: string;
  viewUrl: string | null;
};

export async function signIdentityVerificationFiles(
  admin: SupabaseClient,
  files: { file_kind: string; file_path: string; file_name: string; storage_bucket?: string | null }[]
): Promise<VerificationFileWithUrl[]> {
  return Promise.all(
    files.map(async (file) => {
      const bucket = file.storage_bucket?.trim() || "assets";
      const { data, error } = await admin.storage
        .from(bucket)
        .createSignedUrl(file.file_path, IDENTITY_REVIEW_SIGNED_URL_TTL_SEC);

      if (error) {
        console.error("identity review signed url:", file.file_path, error.message);
      }

      return {
        file_kind: file.file_kind,
        file_path: file.file_path,
        file_name: file.file_name,
        viewUrl: data?.signedUrl ?? null,
      };
    })
  );
}
