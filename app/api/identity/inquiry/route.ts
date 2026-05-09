import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // For MVP we don't pre-create an inquiry server-side; we only return referenceId.
  // The webhook is the source of truth for profiles.kyc_status updates.
  return NextResponse.json({ referenceId: user.id, inquiryId: null });
}

