import { NextResponse } from "next/server";
import { isAllowedEmail } from "@/lib/api/allowed-users";
import { isSafeRedirect } from "@/lib/api/session";
import { createAuthClient } from "@/lib/supabase/auth-server";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const passwordConfirm = String(form.get("password_confirm") ?? "");
  const next = isSafeRedirect(String(form.get("next") ?? "/"));
  const origin = new URL(request.url).origin;

  // Basic validation
  if (!email || !password) {
    return redirectToSignup(origin, next, "missing_fields");
  }

  if (password.length < 8) {
    return redirectToSignup(origin, next, "weak_password");
  }

  if (password !== passwordConfirm) {
    return redirectToSignup(origin, next, "passwords_dont_match");
  }

  if (form.get("terms") !== "1") {
    return redirectToSignup(origin, next, "terms_not_accepted");
  }

  if (!isAllowedEmail(email)) {
    return redirectToSignup(origin, next, "forbidden");
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/login`,
      data: {
        first_name: String(form.get("first_name") ?? "").trim(),
        last_name: String(form.get("last_name") ?? "").trim(),
      },
    },
  });

  if (error) {
    const code = error.message?.includes("already registered")
      ? "email_in_use"
      : "signup_failed";
    return redirectToSignup(origin, next, code);
  }

  return NextResponse.redirect(
    new URL(`/login?message=check_email`, origin),
  );
}

function redirectToSignup(origin: string, next: string, error: string) {
  const url = new URL("/signup", origin);
  url.searchParams.set("next", next);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}
