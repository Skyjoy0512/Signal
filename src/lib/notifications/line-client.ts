import type { NotificationPriority, LineAlertInput } from "./types";

/**
 * LINE Messaging API client for Signal.
 *
 * Environment variables:
 * - LINE_CHANNEL_ACCESS_TOKEN: Channel access token (long-lived)
 * - LINE_CHANNEL_SECRET: Channel secret (for webhook verification)
 * - LINE_USER_ID: Default recipient user ID
 */

const LINE_API_BASE = "https://api.line.me/v2/bot/message/push";

export class LineClient {
  private readonly accessToken: string;
  private readonly defaultUserId: string;

  constructor() {
    this.accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
    this.defaultUserId = process.env.LINE_USER_ID ?? "";
  }

  get isConfigured(): boolean {
    return this.accessToken.length > 0 && this.defaultUserId.length > 0;
  }

  async sendMessage(message: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) return { success: false, error: "LINE client not configured" };
    try {
      const response = await fetch(LINE_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.accessToken}` },
        body: JSON.stringify({ to: this.defaultUserId, messages: [{ type: "text", text: message }] }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        return { success: false, error: `LINE API ${response.status}: ${body}` };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown LINE error" };
    }
  }

  async sendFlexMessage(altText: string, contents: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) return { success: false, error: "LINE client not configured" };
    try {
      const response = await fetch(LINE_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.accessToken}` },
        body: JSON.stringify({ to: this.defaultUserId, messages: [{ type: "flex", altText, contents }] }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        return { success: false, error: `LINE API ${response.status}: ${body}` };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown LINE error" };
    }
  }

  /**
   * Verify a LINE webhook signature using Web Crypto API.
   * Compatible with both Node.js and Edge runtime.
   */
  async verifySignature(body: string, signature: string): Promise<boolean> {
    const secret = process.env.LINE_CHANNEL_SECRET;
    if (!secret) return false;
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const digest = btoa(String.fromCharCode(...new Uint8Array(sig)));
      return signature === digest;
    } catch {
      return false;
    }
  }

  parseWebhook(body: unknown): Array<{ type: string; replyToken?: string; message?: { type: string; text: string }; source?: { userId: string; type: string } }> {
    const data = body as Record<string, unknown>;
    const events = data?.events;
    if (!Array.isArray(events)) return [];
    return events as Array<{ type: string; replyToken?: string; message?: { type: string; text: string }; source?: { userId: string; type: string } }>;
  }
}
