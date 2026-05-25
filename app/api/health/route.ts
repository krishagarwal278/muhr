export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthCheck {
  ok: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    name: string;
    status: "pass" | "fail";
    message?: string;
  }[];
}

export async function GET() {
  const checks: HealthCheck["checks"] = [];
  
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
  
  checks.push({
    name: "env:supabase_url",
    status: hasSupabaseUrl ? "pass" : "fail",
    message: hasSupabaseUrl ? undefined : "NEXT_PUBLIC_SUPABASE_URL not configured",
  });
  
  checks.push({
    name: "env:supabase_key",
    status: hasSupabaseKey ? "pass" : "fail",
    message: hasSupabaseKey ? undefined : "Supabase anon key not configured",
  });

  const allPassing = checks.every((c) => c.status === "pass");
  const anyFailing = checks.some((c) => c.status === "fail");

  const healthStatus = allPassing ? "healthy" : anyFailing ? "unhealthy" : "degraded";

  const response: HealthCheck = {
    ok: healthStatus === "healthy",
    status: healthStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    checks,
  };

  const httpStatus = healthStatus === "healthy" ? 200 : healthStatus === "degraded" ? 200 : 503;

  return Response.json(response, { status: httpStatus });
}
