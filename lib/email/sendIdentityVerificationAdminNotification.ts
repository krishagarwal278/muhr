import { escapeHtml } from "@/lib/email/escapeHtml";
import { resendSendEmail } from "@/lib/email/resendSend";

export type IdentityVerificationFileRow = {
  file_kind: string;
  file_path: string;
  file_name: string;
  /** Time-limited signed URL to view the image (7 days). */
  viewUrl?: string | null;
};

export type IdentityVerificationAdminEmailPayload = {
  userId: string;
  userEmail: string | null;
  fullName: string;
  phone: string;
  address: string;
  socialPlatform: string;
  socialUsername: string;
  submittedAtIso: string;
  files: IdentityVerificationFileRow[];
};

function supabaseDashboardStorageUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) return null;
  try {
    const host = new URL(base).hostname;
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    if (!match) return null;
    return `https://supabase.com/dashboard/project/${match[1]}/storage/buckets/assets`;
  } catch {
    return null;
  }
}

function supabaseDashboardTableHint(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) return "Supabase → Table Editor → identity_verification_files";
  try {
    const host = new URL(base).hostname;
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    if (!match) return "Supabase → Table Editor → identity_verification_files";
    return `https://supabase.com/dashboard/project/${match[1]}/editor`;
  } catch {
    return "Supabase → Table Editor → identity_verification_files";
  }
}

function fileKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    liveness_front: "Selfie (front)",
    liveness_left: "Selfie (left)",
    liveness_right: "Selfie (right)",
    social_followers: "Follower count screenshot",
    social_age: "Audience age screenshot",
    social_location: "Top locations screenshot",
  };
  return labels[kind] ?? kind;
}

/**
 * Notifies the operator when a creator submits manual identity verification.
 * Screenshots stay in Supabase Storage — this email does not attach images (PII-safe).
 * Set IDENTITY_VERIFICATION_NOTIFY_EMAIL to override the default recipient.
 */
export async function sendIdentityVerificationAdminNotification(
  payload: IdentityVerificationAdminEmailPayload
): Promise<void> {
  const to =
    process.env.IDENTITY_VERIFICATION_NOTIFY_EMAIL?.trim() || "krishagarwal278@gmail.com";

  const handle = payload.socialUsername.replace(/^@/, "");
  const storageUrl = supabaseDashboardStorageUrl();
  const editorHint = supabaseDashboardTableHint();

  const profileRows: [string, string][] = [
    ["User ID", payload.userId],
    ["Auth email", payload.userEmail ?? "—"],
    ["Full name", payload.fullName],
    ["Phone", payload.phone],
    ["Address", payload.address],
    ["Social", `${payload.socialPlatform} @${handle}`],
    ["Submitted (UTC)", payload.submittedAtIso],
  ];

  const fileLines = payload.files.map((f) => {
    const label = fileKindLabel(f.file_kind);
    if (f.viewUrl) return `  • ${label}: ${f.viewUrl}`;
    return `  • ${label}: ${f.file_path} (${f.file_name})`;
  });

  const text = [
    "New Muhr identity verification submission",
    "",
    ...profileRows.map(([k, v]) => `${k}: ${v}`),
    "",
    "View links (expire in 7 days) or open Supabase Storage:",
    ...fileLines,
    "",
    `1. Table Editor → identity_verification_files (filter user_id = ${payload.userId})`,
    `2. Storage → assets → ${payload.userId}/identity-verification/`,
    storageUrl ? `   Storage dashboard: ${storageUrl}` : "",
    typeof editorHint === "string" && editorHint.startsWith("http") ?
      `   Table editor: ${editorHint}`
    : `   ${editorHint}`,
    "",
    "Set profiles.kyc_status to verified or failed after review.",
  ]
    .filter(Boolean)
    .join("\n");

  const profileTable = profileRows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #e5e5e5;background:#fafafa;font-weight:600;width:160px;">${escapeHtml(k)}</td><td style="padding:8px 12px;border:1px solid #e5e5e5;">${escapeHtml(v)}</td></tr>`
    )
    .join("");

  const filesList = payload.files
    .map((f) => {
      const label = escapeHtml(fileKindLabel(f.file_kind));
      if (f.viewUrl) {
        return `<li style="margin:8px 0;"><a href="${escapeHtml(f.viewUrl)}" style="font-weight:600;">${label}</a> — view image</li>`;
      }
      return `<li style="margin:8px 0;"><strong>${label}</strong><br/><code style="font-size:12px;">${escapeHtml(f.file_path)}</code></li>`;
    })
    .join("");

  const storageLink = storageUrl ?
    `<p><a href="${escapeHtml(storageUrl)}">Open Storage (assets bucket)</a></p>`
  : "";

  const html = `<!DOCTYPE html>
<html><body style="color:#111;line-height:1.5;font-family:system-ui,sans-serif;">
<p style="font-size:16px;font-weight:600;">Identity verification submitted</p>
<p>A creator finished the manual verification flow. Use the <strong>view links</strong> below (expire in 7 days) or open Supabase Storage to review.</p>
<table style="border-collapse:collapse;font-size:14px;max-width:640px;margin:16px 0;">${profileTable}</table>
<p style="font-weight:600;margin-top:20px;">Files to review</p>
<ul style="padding-left:20px;">${filesList}</ul>
<p style="margin-top:20px;font-size:14px;">
  <strong>Where to look:</strong><br/>
  Table <code>identity_verification_files</code> · Storage <code>assets/${escapeHtml(payload.userId)}/identity-verification/</code>
</p>
${storageLink}
<p style="font-size:12px;color:#666;margin-top:24px;">After review, update <code>profiles.kyc_status</code> to <code>verified</code> or <code>failed</code>.</p>
</body></html>`;

  const from = process.env.RESEND_FROM_EMAIL?.trim() || "Muhr <communication@muhr.app>";

  await resendSendEmail(
    to,
    `[Muhr] Identity verification: ${payload.fullName} (@${handle})`,
    text,
    {
      from,
      replyTo: payload.userEmail ?? undefined,
      html,
    }
  );
}
