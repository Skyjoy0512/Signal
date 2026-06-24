import { NextResponse } from "next/server";
import { adminSessionValue, AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME, isSafeRedirect } from "@/lib/api/session";

export async function POST(request: Request) {
  const token = process.env.APP_ADMIN_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "admin_token_missing", message: "APP_ADMIN_TOKEN is required" }, { status: 401 });
  }

  const form = await request.formData();
  const candidate = String(form.get("token") ?? "").trim();
  const next = isSafeRedirect(String(form.get("next") ?? "/"));
  if (candidate !== token) {
    return redirectToLogin(request.url, next, "1");
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(AUTH_COOKIE_NAME, adminSessionValue(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
  return response;
}

function redirectToLogin(baseUrl: string, next: string, error: string) {
  const url = new URL("/login", baseUrl);
  url.searchParams.set("next", next);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}
