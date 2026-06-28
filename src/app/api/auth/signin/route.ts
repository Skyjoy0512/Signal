import { NextResponse } from "next/server";
import { isAllowedEmail } from "@/lib/api/allowed-users";
import { isSafeRedirect } from "@/lib/api/session";
import { createAuthClient } from "@/lib/supabase/auth-server";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = isSafeRedirect(String(form.get("next") ?? "/"));
  const origin = new URL(request.url).origin;

  if (!email || !password) {
    return redirectToLogin(origin, next, "missing_fields");
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const code =
      error.message?.includes("Invalid login") ? "invalid_credentials"
      : error.message?.includes("Email not confirmed") ? "email_not_confirmed"
      : "signin_failed";
    return redirectToLogin(origin, next, code);
  }

  if (!isAllowedEmail(email)) {
    await supabase.auth.signOut();
    return redirectToLogin(origin, next, "forbidden");
  }

  return NextResponse.redirect(new URL(next, origin));
}

function redirectToLogin(origin: string, next: string, error: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("next", next);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}
