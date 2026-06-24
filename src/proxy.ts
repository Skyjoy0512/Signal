import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAllowedEmail } from "@/lib/api/allowed-users";

const AUTH_COOKIE_NAME = "signal-auth";

const PUBLIC_PATH_PREFIXES = [
  "/_next",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/google",
  "/api/auth/callback",
  "/favicon.ico",
  "/images",
  "/login",
  "/robots.txt",
  "/sitemap.xml",
];

const SELF_AUTHENTICATING_API_PREFIXES = [
  "/api/fundamentals/seed",
  "/api/line/webhook",
];

export async function proxy(request: NextRequest) {
  const token = process.env.APP_ADMIN_TOKEN?.trim();
  if (!token) {
    if (process.env.NODE_ENV === "production") {
      return unauthorized(request);
    }
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }

  if (SELF_AUTHENTICATING_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }

  const expected = await sessionValue(token);
  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";
  if (cookieValue && constantTimeEqual(cookieValue, expected)) return NextResponse.next();

  const authResponse = await allowSupabaseSession(request);
  if (authResponse) return authResponse;

  if (pathname.startsWith("/api/")) {
    const bearer = bearerToken(request);
    const headerToken = request.headers.get("x-signal-admin-token")?.trim() ?? "";
    if (constantTimeEqual(bearer, token) || constantTimeEqual(headerToken, token)) return NextResponse.next();
  }

  return unauthorized(request);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};

function unauthorized(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized", message: "Login is required" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

function bearerToken(request: NextRequest): string {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
}

async function allowSupabaseSession(request: NextRequest): Promise<NextResponse | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  if (!isAllowedEmail(data.user.email)) return forbidden(request);
  return response;
}

function forbidden(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "forbidden", message: "This Google account is not allowed" }, { status: 403 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}&error=forbidden`;
  return NextResponse.redirect(url);
}

async function sessionValue(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
