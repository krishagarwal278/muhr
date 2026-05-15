import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import type { LicenseRequestRow } from "@/types/license";
import { LicenseRequestWorkspace } from "./LicenseRequestWorkspace";

export default async function LicenseRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: row, error } = await supabase
    .from("license_requests")
    .select("*")
    .eq("id", requestId)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("license_requests page:", error);
    notFound();
  }
  if (!row) {
    notFound();
  }

  const request = row as LicenseRequestRow;

  return <LicenseRequestWorkspace initialRequest={request} />;
}
