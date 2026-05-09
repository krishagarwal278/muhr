import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
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

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: cases, error } = await supabase
    .from("enforcement_cases")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching cases:", error);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }

  const open = cases?.filter(c => c.status === "open") || [];
  const inProgress = cases?.filter(c => c.status === "in_progress") || [];
  const resolved = cases?.filter(c => c.status === "resolved" || c.status === "rejected") || [];

  return NextResponse.json({
    cases: cases || [],
    open,
    inProgress,
    resolved,
  });
}

export async function POST(request: Request) {
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

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { platform, url, description } = body;

  if (!platform || !url) {
    return NextResponse.json({ error: "Platform and URL are required" }, { status: 400 });
  }

  const { data: newCase, error } = await supabase
    .from("enforcement_cases")
    .insert({
      user_id: user.id,
      platform,
      url,
      description: description || "",
      status: "open",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating case:", error);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }

  // Send email notification using Resend (or log for now)
  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const caseId = newCase.id.substring(0, 8).toUpperCase();
  
  // Try to send email via Resend
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFICATION_EMAIL = "krishagarwal278@gmail.com";
  
  if (RESEND_API_KEY) {
    try {
      console.log("Attempting to send email notification...");
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Muhr <onboarding@resend.dev>",
          to: [NOTIFICATION_EMAIL],
          subject: `[Muhr] New Enforcement Case #${caseId}`,
          html: `
            <h2>New Enforcement Case Reported</h2>
            <p><strong>Case ID:</strong> ${caseId}</p>
            <p><strong>User:</strong> ${userName} (${user.email})</p>
            <p><strong>Platform:</strong> ${platform}</p>
            <p><strong>URL:</strong> <a href="${url}">${url}</a></p>
            <p><strong>Description:</strong></p>
            <p>${description || "No description provided"}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated notification from Muhr.</p>
          `,
        }),
      });

      const emailResult = await emailResponse.json();
      
      if (!emailResponse.ok) {
        console.error("Resend API error:", emailResult);
      } else {
        console.log("Email sent successfully:", emailResult);
      }
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
    }
  } else {
    console.log("Email notification (RESEND_API_KEY not set):", {
      to: NOTIFICATION_EMAIL,
      subject: `New Enforcement Case #${caseId}`,
      userName,
      platform,
      url,
      description,
    });
  }

  return NextResponse.json({
    success: true,
    message: "Case created successfully",
    case: newCase,
  });
}
