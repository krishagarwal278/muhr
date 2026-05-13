import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getUserForMiddleware } from "@/lib/auth/middlewareSupabaseUser";
import { safeInternalPath } from "@/lib/auth/safeRedirectPath";

const protectedPaths = [
  "/dashboard",
  "/vault",
  "/consent",
  "/licenses",
  "/enforcement",
  "/settings",
  "/update-password",
  "/brand",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Supabase often redirects failed magic links / OAuth to your Site URL (`/`).
  // Forward those query params to `/login` so users see an explanation (and we can strip them client-side).
  if (pathname === "/") {
    const sp = request.nextUrl.searchParams;
    if (sp.has("error") || sp.has("error_code")) {
      const loginUrl = new URL("/login", request.url);
      sp.forEach((value, key) => {
        loginUrl.searchParams.set(key, value);
      });
      return NextResponse.redirect(loginUrl);
    }
    // Supabase falls back to "Site URL" (often `/`) when `redirect_to` from the email
    // is not in the project's Redirect URL allow list — the PKCE `code` then lands here
    // and is never exchanged. Forward to the auth callback so recovery can continue.
    const pkceCode = sp.get("code");
    if (pkceCode) {
      const cb = new URL("/api/auth/callback", request.url);
      cb.searchParams.set("code", pkceCode);
      const next = safeInternalPath(sp.get("next"), "/update-password");
      cb.searchParams.set("next", next);
      return NextResponse.redirect(cb);
    }
  }

  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Local break-glass only: never honored in production builds (`NODE_ENV === "production"`).
  if (process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "1") {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY)."
    );
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const user = await getUserForMiddleware(supabase);

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/vault/:path*",
    "/consent/:path*",
    "/licenses/:path*",
    "/enforcement/:path*",
    "/settings/:path*",
    "/update-password",
    "/brand",
    "/brand/:path*",
  ],
};
