import { NextResponse } from "next/server";
import { isAllowedEmail } from "@/lib/api/allowed-users";
import { isSafeRedirect } from "@/lib/api/session";
import { createAuthClient } from "@/lib/supabase/auth-server";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const next = isSafeRedirect(String(form.get("next") ?? "/"));
  const origin = new URL(request.url).origin;

  if (!email) {
    return redirectToLogin(origin, next, "missing_fields");
  }

  if (!isAllowedEmail(email)) {
    return redirectToLogin(origin, next, "forbidden");
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return redirectToLogin(origin, next, "magiclink_failed");
  }

  return NextResponse.redirect(
    new URL(`/login?next=${encodeURIComponent(next)}&message=magiclink_sent`, origin),
  );
}

function redirectToLogin(origin: string, next: string, error: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("next", next);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}
