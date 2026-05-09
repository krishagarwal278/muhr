import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

function mapPersonaStatusToKyc(status: string | null | undefined) {
  // Persona inquiry status commonly: created | pending | completed | approved | declined | expired
  switch (status) {
    case "approved":
      return "verified" as const;
    case "declined":
      return "failed" as const;
    case "expired":
      return "unverified" as const;
    case "created":
    case "pending":
    case "completed":
      return "pending" as const;
    default:
      return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.PERSONA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing PERSONA_API_KEY on server" },
      { status: 500 }
    );
  }

  let body: { inquiryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inquiryId = typeof body.inquiryId === "string" ? body.inquiryId.trim() : "";
  if (!inquiryId) {
    return NextResponse.json({ error: "Missing inquiryId" }, { status: 400 });
  }

  const resp = await fetch(`https://api.withpersona.com/api/v1/inquiries/${encodeURIComponent(inquiryId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Persona-Version": "2023-01-05",
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: "Persona fetch failed", status: resp.status, details: text.slice(0, 500) },
      { status: 502 }
    );
  }

  const json: any = await resp.json().catch(() => null);
  const personaStatus: string | undefined = json?.data?.attributes?.status;
  const next = mapPersonaStatusToKyc(personaStatus);

  if (!next) {
    return NextResponse.json(
      { error: "Unknown Persona status", personaStatus: personaStatus ?? null },
      { status: 422 }
    );
  }

  const update: Record<string, any> = { kyc_status: next };
  if (next === "verified") update.kyc_verified_at = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    console.error("profiles update from refresh:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true, kycStatus: next, personaStatus: personaStatus ?? null });
}

