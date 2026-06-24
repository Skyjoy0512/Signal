export function isAllowedEmail(email: string | null | undefined): boolean {
  const allowlist = allowedEmails();
  if (allowlist.length === 0) return process.env.NODE_ENV !== "production";
  return Boolean(email && allowlist.includes(email.toLowerCase()));
}

export function allowedEmails(): string[] {
  return (process.env.SIGNAL_AUTH_ALLOWED_EMAILS || process.env.APP_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
