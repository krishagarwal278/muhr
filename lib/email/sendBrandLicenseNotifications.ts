import { getEmailSiteBaseUrl } from "@/lib/app/publicSiteUrl";
import { escapeHtml } from "@/lib/email/escapeHtml";
import { resendSendEmail } from "@/lib/email/resendSend";
import { logger } from "@/lib/logger";

function formatInr(n: number | null | undefined): string {
  if (n == null) return "— (not specified)";
  return `₹${n.toLocaleString("en-IN")}`;
}

function offerSummaryLines(opts: {
  channels: string[];
  territories: string[];
  durationDays: number;
  budgetInr: number | null;
}): string[] {
  return [
    `Channels: ${opts.channels.join(", ") || "—"}`,
    `Territories: ${opts.territories.join(", ") || "—"}`,
    `Duration: ${opts.durationDays} days`,
    `Budget: ${formatInr(opts.budgetInr)}`,
  ];
}

export type BrandOfferConfirmationPayload = {
  brandName: string;
  brandEmail: string;
  creatorDisplayName: string;
  creatorHandle: string;
  intendedUse: string;
  channels: string[];
  territories: string[];
  durationDays: number;
  budgetInr: number | null;
  requestId: string;
};

/** Copy of the offer for brands who submitted via a creator public page without a Muhr account. */
export async function sendBrandOfferConfirmationEmail(
  payload: BrandOfferConfirmationPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("brand_offer_confirmation_skipped", { reason: "no_resend" });
    return;
  }

  const base = getEmailSiteBaseUrl();
  const landingUrl = base;
  const creatorPage = `${base}/k/${payload.creatorHandle}`;

  const summary = offerSummaryLines(payload);
  const subject = `[Muhr] Copy of your license request to ${payload.creatorDisplayName}`;

  const text = [
    `Hi ${payload.brandName},`,
    ``,
    `This confirms the license request you sent to ${payload.creatorDisplayName} (@${payload.creatorHandle}) on Muhr.`,
    ``,
    `Intended use:`,
    payload.intendedUse,
    ``,
    ...summary,
    ``,
    `Reference: ${payload.requestId}`,
    ``,
    `The creator will review your request in their Muhr dashboard. When you create a Muhr brand account with this email (${payload.brandEmail}), your requests will appear on your dashboard automatically.`,
    ``,
    `Visit Muhr: ${landingUrl}`,
    `Creator profile: ${creatorPage}`,
    ``,
    `— Muhr`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html><body style="color:#111;line-height:1.5;font-family:system-ui,sans-serif;">
<p>Hi ${escapeHtml(payload.brandName)},</p>
<p>This confirms the license request you sent to <strong>${escapeHtml(payload.creatorDisplayName)}</strong> (@${escapeHtml(payload.creatorHandle)}) on Muhr.</p>
<p style="font-weight:600;margin-top:20px;">Intended use</p>
<pre style="white-space:pre-wrap;font-size:13px;padding:12px;background:#f4f4f5;border-radius:8px;border:1px solid #e5e5e5;">${escapeHtml(payload.intendedUse)}</pre>
<ul style="padding-left:18px;">
${summary.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
</ul>
<p style="font-size:13px;color:#555;">Reference: <code>${escapeHtml(payload.requestId)}</code></p>
<p>The creator will review your request in their Muhr dashboard. When you sign up on Muhr with <strong>${escapeHtml(payload.brandEmail)}</strong>, your past requests will appear on your brand dashboard.</p>
<p><a href="${escapeHtml(landingUrl)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Open Muhr</a></p>
<p style="font-size:13px;"><a href="${escapeHtml(creatorPage)}">View creator profile</a></p>
</body></html>`;

  await resendSendEmail(payload.brandEmail, subject, text, { html });
}

export type BrandCounterOfferPayload = {
  brandName: string;
  brandEmail: string;
  creatorDisplayName: string;
  creatorHandle: string;
  originalChannels: string[];
  originalTerritories: string[];
  originalDurationDays: number;
  originalBudgetInr: number | null;
  proposedChannels: string[];
  proposedTerritories: string[];
  proposedDurationDays: number;
  proposedBudgetInr: number;
  note: string | null;
};

/** Notifies external brands when a creator sends a counter-offer. */
export async function sendBrandCounterOfferEmail(payload: BrandCounterOfferPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("brand_counter_offer_email_skipped", { reason: "no_resend" });
    return;
  }

  const landingUrl = getEmailSiteBaseUrl();

  const originalSummary = offerSummaryLines({
    channels: payload.originalChannels,
    territories: payload.originalTerritories,
    durationDays: payload.originalDurationDays,
    budgetInr: payload.originalBudgetInr,
  });
  const proposedSummary = offerSummaryLines({
    channels: payload.proposedChannels,
    territories: payload.proposedTerritories,
    durationDays: payload.proposedDurationDays,
    budgetInr: payload.proposedBudgetInr,
  });

  const subject = `[Muhr] ${payload.creatorDisplayName} sent a counter-offer on your license request`;

  const text = [
    `Hi ${payload.brandName},`,
    ``,
    `${payload.creatorDisplayName} (@${payload.creatorHandle}) proposed revised terms for your license request on Muhr.`,
    ``,
    `Your original offer:`,
    ...originalSummary,
    ``,
    `Creator's counter-offer:`,
    ...proposedSummary,
    payload.note ? `\nNote from creator:\n${payload.note}` : "",
    ``,
    `Visit Muhr to learn more and sign up with ${payload.brandEmail} when you're ready:`,
    landingUrl,
    ``,
    `— Muhr`,
  ]
    .filter(Boolean)
    .join("\n");

  const noteBlock = payload.note?.trim()
    ? `<p style="font-weight:600;margin-top:16px;">Note from creator</p><pre style="white-space:pre-wrap;font-size:13px;padding:12px;background:#f5f3ff;border-radius:8px;border:1px solid #ddd6fe;">${escapeHtml(payload.note.trim())}</pre>`
    : "";

  const html = `<!DOCTYPE html>
<html><body style="color:#111;line-height:1.5;font-family:system-ui,sans-serif;">
<p>Hi ${escapeHtml(payload.brandName)},</p>
<p><strong>${escapeHtml(payload.creatorDisplayName)}</strong> (@${escapeHtml(payload.creatorHandle)}) proposed revised terms for your license request.</p>
<div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:20px;">
  <div style="flex:1;min-width:240px;padding:12px;background:#fafafa;border-radius:8px;border:1px solid #e5e5e5;">
    <p style="font-weight:600;margin:0 0 8px;">Your original offer</p>
    <ul style="margin:0;padding-left:18px;">${originalSummary.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
  </div>
  <div style="flex:1;min-width:240px;padding:12px;background:#f5f3ff;border-radius:8px;border:1px solid #ddd6fe;">
    <p style="font-weight:600;margin:0 0 8px;">Creator counter-offer</p>
    <ul style="margin:0;padding-left:18px;">${proposedSummary.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
  </div>
</div>
${noteBlock}
<p style="margin-top:20px;">Sign in or create a Muhr account with <strong>${escapeHtml(payload.brandEmail)}</strong> to respond when you're ready.</p>
<p><a href="${escapeHtml(landingUrl)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Open Muhr</a></p>
</body></html>`;

  await resendSendEmail(payload.brandEmail, subject, text, { html });
}
