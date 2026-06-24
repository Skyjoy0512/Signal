import crypto from "crypto";
import { errorResponse } from "./response";

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
  if (safeTokenEqual(bearer, token) || safeTokenEqual(headerToken, token)) return null;
  return errorResponse("unauthorized", "Admin token is required", 401);
}

function safeTokenEqual(candidate: string, expected: string): boolean {
  if (!candidate) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}
