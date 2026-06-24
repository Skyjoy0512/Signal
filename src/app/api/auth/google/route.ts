import { NextResponse } from "next/server";
import { isSafeRedirect } from "@/lib/api/session";
import { createAuthClient } from "@/lib/supabase/auth-server";

export async function POST(request: Request) {
  const form = await request.formData();
  const next = isSafeRedirect(String(form.get("next") ?? "/"));
  const origin = new URL(request.url).origin;
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    const url = new URL("/login", origin);
    url.searchParams.set("next", next);
    url.searchParams.set("error", "oauth");
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(data.url);
}
