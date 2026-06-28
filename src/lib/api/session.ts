import crypto from "crypto";

export const AUTH_COOKIE_NAME = "signal-auth";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function adminSessionValue(token = process.env.APP_ADMIN_TOKEN ?? ""): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

export function isSafeRedirect(value: string | null): string {
  if (!value || value === "/" || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
