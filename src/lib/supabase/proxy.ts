import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";

function getSessionSecret(): Uint8Array | null {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  return new TextEncoder().encode(secret);
}

async function hasValidSessionCookie(request: NextRequest): Promise<boolean> {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return false;

  const parts = raw.split(".");
  // token.jwtHeader.jwtPayload.jwtSignature => token + 3 JWT parts
  if (parts.length < 4) return false;

  const jwt = parts.slice(1).join(".");
  const secret = getSessionSecret();
  if (!secret) return false;

  try {
    await jwtVerify(jwt, secret);
    return true;
  } catch {
    return false;
  }
}

/**
 * Custom-auth route protection (no Supabase Auth).
 */
export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Never redirect Server Action POSTs — a middleware HTML redirect breaks
  // the action protocol ("An unexpected response was received from the server").
  const isServerAction =
    request.method === "POST" &&
    (request.headers.has("next-action") ||
      request.headers.has("Next-Action"));

  if (isServerAction) {
    return supabaseResponse;
  }

  const isAuthenticated = await hasValidSessionCookie(request);
  const pathname = request.nextUrl.pathname;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/profiles") ||
    pathname.startsWith("/interests") ||
    pathname.startsWith("/matches") ||
    pathname.startsWith("/shortlist") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/admin");

  if (!isAuthenticated && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isAuthRoute) {
    // Role-specific home is resolved in /dashboard (admins → /admin)
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
