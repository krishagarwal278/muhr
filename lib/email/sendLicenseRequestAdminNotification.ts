import { MUHR_CONTACT_EMAIL, MUHR_CONTACT_FROM } from "@/lib/app/contactEmail";
import { escapeHtml } from "@/lib/email/escapeHtml";
import { getEmailSiteBaseUrl } from "@/lib/app/publicSiteUrl";
import { resendSendEmail } from "@/lib/email/resendSend";

export type LicenseRequestEmailPayload = {
  requestId: string;
  requestToken: string;
  createdAtIso: string;
  creatorHandle: string;
  creatorDisplayName: string;
  /** Creator's public licensing notes at submit time (if any). */
  creatorLicensingNotes: string | null;
  brandEmail: string;
  brandName: string;
  brandCompany: string | null;
  brandWebsite: string | null;
  intendedUse: string;
  channels: string[];
  territories: string[];
  durationDays: number;
  budgetInr: number | null;
};

function rowsHtml(rows: [string, string][]): string {
  return rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #e5e5e5;background:#fafafa;font-weight:600;width:180px;">${escapeHtml(k)}</td><td style="padding:8px 12px;border:1px solid #e5e5e5;">${escapeHtml(v)}</td></tr>`
    )
    .join("");
}

/**
 * Notifies the operator when a brand submits a public license request.
 * Set LICENSE_REQUEST_NOTIFY_EMAIL to override the default recipient.
 */
export async function sendLicenseRequestAdminNotification(
  payload: LicenseRequestEmailPayload
): Promise<void> {
  const appBaseUrl = getEmailSiteBaseUrl();
  const to =
    process.env.LICENSE_REQUEST_NOTIFY_EMAIL?.trim() || MUHR_CONTACT_EMAIL;

  const budgetLabel =
    payload.budgetInr === null ? "— (not specified)" : `₹${payload.budgetInr.toLocaleString("en-IN")}`;

  const lines: [string, string][] = [
    ["Request ID", payload.requestId],
    ["Submitted (UTC)", payload.createdAtIso],
    ["Creator handle", `@${payload.creatorHandle}`],
    ["Creator display name", payload.creatorDisplayName],
    ["Brand contact name", payload.brandName],
    ["Brand email", payload.brandEmail],
    ["Company", payload.brandCompany ?? "—"],
    ["Website", payload.brandWebsite ?? "—"],
    ["Duration", `${payload.durationDays} days`],
    ["Budget (INR)", budgetLabel],
    ["Channels", payload.channels.join(", ")],
    ["Territories", payload.territories.join(", ")],
  ];

  const notesSection = payload.creatorLicensingNotes?.trim()
    ? `Creator licensing notes (at submit time):\n${payload.creatorLicensingNotes.trim()}`
    : "Creator licensing notes: (none at submit time)";

  const text = [
    `New Muhr license request`,
    ``,
    ...lines.map(([k, v]) => `${k}: ${v}`),
    ``,
    notesSection,
    ``,
    `Intended use:`,
    payload.intendedUse,
    ``,
    `Token (for support): ${payload.requestToken}`,
    `Creator public page: ${appBaseUrl.replace(/\/$/, "")}/k/${payload.creatorHandle}`,
  ].join("\n");

  const table = `<table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px;max-width:640px;">${rowsHtml(lines)}</table>`;

  const intendedBlock = `<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;font-size:13px;padding:12px;background:#f4f4f5;border-radius:8px;border:1px solid #e5e5e5;">${escapeHtml(payload.intendedUse)}</pre>`;

  const notesBlock =
    payload.creatorLicensingNotes?.trim() ?
      `<p style="margin-top:16px;font-weight:600;">Creator licensing notes (at submit time)</p><pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;font-size:13px;padding:12px;background:#eef6ff;border-radius:8px;border:1px solid #cfe8ff;">${escapeHtml(payload.creatorLicensingNotes.trim())}</pre>`
    : "";

  const html = `<!DOCTYPE html>
<html><body style="color:#111;line-height:1.5;">
<p style="font-size:16px;font-weight:600;">New license request</p>
<p>A brand submitted a request on a creator public page. Fields below match the public form; <strong>intended use</strong> is the full free-text answer.</p>
${table}
${notesBlock}
<p style="margin-top:16px;font-weight:600;">Intended use (full text)</p>
${intendedBlock}
<p style="margin-top:20px;font-size:13px;color:#555;">
  <a href="${escapeHtml(`${appBaseUrl.replace(/\/$/, "")}/k/${payload.creatorHandle}`)}">Open creator public page</a>
  · Request token: <code>${escapeHtml(payload.requestToken)}</code>
</p>
<p style="font-size:12px;color:#777;">Reply in your mail client will go to the brand if you set reply-to to their email (configured in code).</p>
</body></html>`;

  const from = process.env.RESEND_FROM_EMAIL?.trim() || MUHR_CONTACT_FROM;

  await resendSendEmail(to, `[Muhr] License request: @${payload.creatorHandle} ← ${payload.brandName}`, text, {
    from,
    replyTo: payload.brandEmail,
    html,
  });
}
