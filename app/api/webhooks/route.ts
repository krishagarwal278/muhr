import { NextResponse } from "next/server";

/**
 * Generic webhook receiver is disabled until signature verification and routing exist.
 * Do not return a success body for unsigned requests.
 */
function disabled() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "webhook_disabled",
        message: "This endpoint is not enabled.",
      },
    },
    { status: 410 }
  );
}

export const GET = disabled;
export const POST = disabled;
export const PUT = disabled;
export const PATCH = disabled;
export const DELETE = disabled;
