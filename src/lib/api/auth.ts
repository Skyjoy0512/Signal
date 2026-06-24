import crypto from "crypto";
import { errorResponse } from "./response";
import { adminSessionValue, AUTH_COOKIE_NAME } from "./session";

export function requireAdminRequest(req: Request): Response | null {
  const token = process.env.APP_ADMIN_TOKEN?.trim();
  if (!token) {
    if (process.env.NODE_ENV === "production") {
      return errorResponse("admin_token_missing", "APP_ADMIN_TOKEN is required in production", 401);
    }
    return null;
  }

  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  const headerToken = req.headers.get("x-signal-admin-token")?.trim() ?? "";
  const cookieToken = readCookie(req.headers.get("cookie") ?? "", AUTH_COOKIE_NAME);
  const sessionValue = adminSessionValue(token);
  if (safeTokenEqual(bearer, token) || safeTokenEqual(headerToken, token) || safeTokenEqual(cookieToken, sessionValue)) return null;
  return errorResponse("unauthorized", "Admin token is required", 401);
}

function safeTokenEqual(candidate: string, expected: string): boolean {
  if (!candidate) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}

function readCookie(header: string, name: string): string {
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}
