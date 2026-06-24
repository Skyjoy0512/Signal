import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/api/session";
import { createAuthClient } from "@/lib/supabase/auth-server";

export async function POST(request: Request) {
  const supabase = await createAuthClient();
  await supabase.auth.signOut().catch(() => undefined);
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
