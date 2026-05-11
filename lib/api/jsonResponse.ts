import "server-only";

import { NextResponse } from "next/server";

import { toApiError } from "@/lib/errors/apiError";

export function jsonApiError(err: unknown): NextResponse {
  const { status, code, message } = toApiError(err);
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}
