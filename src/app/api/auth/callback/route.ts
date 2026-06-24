import { NextResponse } from "next/server";
import { isAllowedEmail } from "@/lib/api/allowed-users";
import { isSafeRedirect } from "@/lib/api/session";
import { createAuthClient } from "@/lib/supabase/auth-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = isSafeRedirect(url.searchParams.get("next"));
  const origin = url.origin;

  if (!code) {
    return redirectToLogin(origin, next, "oauth");
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectToLogin(origin, next, "oauth");
  }

  const { data } = await supabase.auth.getUser();
  if (!isAllowedEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return redirectToLogin(origin, next, "forbidden");
  }

  return NextResponse.redirect(new URL(next, origin));
}

function redirectToLogin(origin: string, next: string, error: string) {
  const login = new URL("/login", origin);
  login.searchParams.set("next", next);
  login.searchParams.set("error", error);
  return NextResponse.redirect(login);
}
