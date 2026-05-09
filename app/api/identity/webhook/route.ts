import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

function parseSignature(header: string) {
  // Persona-Signature: t=<unix>,v1=<hex>
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

export async function POST(req: NextRequest) {
  const secret = process.env.PERSONA_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Missing PERSONA_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const raw = await req.text();
  const sigHeader = req.headers.get("Persona-Signature") ?? "";
  const { t, v1 } = parseSignature(sigHeader);
  if (!t || !v1) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${raw}`)
    .digest("hex");

  if (!safeEqualHex(expected, v1)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let evt: any;
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName: string | undefined = evt?.data?.attributes?.name;
  const inquiry = evt?.data?.attributes?.payload?.data;
  const referenceId: string | undefined =
    inquiry?.attributes?.["reference-id"] ?? inquiry?.attributes?.referenceId;

  if (!referenceId || typeof referenceId !== "string") {
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
    return NextResponse.json(
      { error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const update: Record<string, any> = { kyc_status: next };
  if (next === "verified") update.kyc_verified_at = new Date().toISOString();
  if (next !== "verified") update.kyc_verified_at = null;

  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", referenceId);

  if (error) {
    console.error("Persona webhook profiles update:", error);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

