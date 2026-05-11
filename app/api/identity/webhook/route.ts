import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api/jsonResponse";
import { logger } from "@/lib/logger";
import {
  personaWebhookEnvelopeSchema,
  referenceIdFromPersonaWebhook,
} from "@/lib/persona/webhookSchema";
import { getRateLimitIp, rateLimit } from "@/lib/ratelimit";
import { createServiceRoleClient } from "@/lib/supabase/service";

const SIGNATURE_MAX_SKEW_SEC = 600;

function parseSignature(header: string) {
  const parts = Object.fromEntries(
    header
      .split(",")
      .map((p) => p.trim())
      .map((p) => p.split("=").map((s) => s.trim()))
  );
  const t = parts.t as string | undefined;
  const v1 = parts.v1 as string | undefined;
  return { t, v1 };
}

function safeEqualHex(a: string, b: string) {
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function deny() {
  return NextResponse.json(
    { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
    { status: 401 }
  );
}

function misconfigured() {
  return NextResponse.json(
    { ok: false, error: { code: "unavailable", message: "Service unavailable" } },
    { status: 503 }
  );
}

export async function POST(req: NextRequest) {
  try {
    await rateLimit({
      key: "persona_webhook",
      identifier: getRateLimitIp(req),
      limit: 120,
      window: "1m",
    });

    const secret = process.env.PERSONA_WEBHOOK_SECRET;
    if (!secret) {
      logger.error("persona_webhook_misconfigured", { reason: "missing_secret" });
      return misconfigured();
    }

    const raw = await req.text();
    const sigHeader = req.headers.get("Persona-Signature") ?? "";
    const { t, v1 } = parseSignature(sigHeader);
    if (!t || !v1) {
      return deny();
    }

    const ts = Number.parseInt(t, 10);
    if (!Number.isFinite(ts)) {
      return deny();
    }
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > SIGNATURE_MAX_SKEW_SEC) {
      logger.warn("persona_webhook_replay_or_skew", { skew_sec: Math.abs(now - ts) });
      return deny();
    }

    const expected = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
    if (!safeEqualHex(expected, v1)) {
      return deny();
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid request" } },
        { status: 400 }
      );
    }

    const envelope = personaWebhookEnvelopeSchema.safeParse(parsedJson);
    if (!envelope.success) {
      logger.warn("persona_webhook_shape", { issues: envelope.error.flatten() });
      return NextResponse.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid request" } },
        { status: 400 }
      );
    }

    const evt = envelope.data;
    const eventName: string | undefined = evt.data?.attributes?.name;
    const referenceId = referenceIdFromPersonaWebhook(evt);

    if (!referenceId) {
      return NextResponse.json({ ok: true });
    }

    const map: Record<string, "unverified" | "pending" | "verified" | "failed"> = {
      "inquiry.created": "pending",
      "inquiry.completed": "pending",
      "inquiry.approved": "verified",
      "inquiry.declined": "failed",
      "inquiry.expired": "unverified",
    };

    const next = eventName ? map[eventName] : undefined;
    if (!next) return NextResponse.json({ ok: true });

    const admin = createServiceRoleClient();
    if (!admin) {
      logger.error("persona_webhook_misconfigured", { reason: "missing_service_role" });
      return misconfigured();
    }

    const update: Record<string, unknown> = { kyc_status: next };
    if (next === "verified") update.kyc_verified_at = new Date().toISOString();
    if (next !== "verified") update.kyc_verified_at = null;

    const { error } = await admin.from("profiles").update(update).eq("id", referenceId);

    if (error) {
      logger.error("persona_webhook_profile_update", { errCode: error.code, message: error.message });
      return NextResponse.json(
        { ok: false, error: { code: "internal_error", message: "Something went wrong" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonApiError(err);
  }
}
