import {
  auditCharacterPhotoIntegrity,
  formatCharacterPhotoIntegrityReport,
} from "@/lib/profile/characterPhotoIntegrity";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_AUDIT_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const header = request.headers.get("x-admin-audit-secret");
  return header === secret;
}

export async function GET(request: Request) {
  if (!process.env.ADMIN_AUDIT_SECRET?.trim()) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "not_configured",
          message: "Set ADMIN_AUDIT_SECRET to enable this endpoint.",
        },
      },
      { status: 503 }
    );
  }

  if (!isAuthorized(request)) {
    return Response.json(
      { ok: false, error: { code: "unauthorized", message: "Invalid audit secret." } },
      { status: 401 }
    );
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "not_configured",
          message: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
        },
      },
      { status: 503 }
    );
  }

  try {
    const report = await auditCharacterPhotoIntegrity(admin);
    return Response.json({
      ok: true,
      data: {
        report,
        summary: formatCharacterPhotoIntegrityReport(report),
        hasIssues:
          report.missingInStorage.length > 0 || report.orphanInStorage.length > 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audit failed";
    return Response.json(
      { ok: false, error: { code: "audit_failed", message } },
      { status: 500 }
    );
  }
}
