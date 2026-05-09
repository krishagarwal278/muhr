import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/server";
import { WaitlistRequest, WaitlistResponse } from "../../../types";

export async function POST(request: NextRequest) {
  try {
    const body: WaitlistRequest = await request.json();
    const { email, user_type } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json<WaitlistResponse>(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!user_type || !["creator", "business"].includes(user_type)) {
      return NextResponse.json<WaitlistResponse>(
        { success: false, message: "Invalid user type." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.toLowerCase().trim(), user_type });

    if (error) {
      console.error("Supabase insert error:", JSON.stringify(error));
      if (error.code === "23505") {
        return NextResponse.json<WaitlistResponse>(
          { success: false, message: "This email is already on the waitlist." },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json<WaitlistResponse>({
      success: true,
      message: "You're on the list. We'll be in touch.",
    });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json<WaitlistResponse>(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
