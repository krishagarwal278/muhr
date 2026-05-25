export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function disabled() {
  return Response.json(
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
