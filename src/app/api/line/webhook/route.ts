import { NextRequest, NextResponse } from "next/server";
import { LineClient } from "@/lib/notifications/line-client";
import { buildWebhookReply } from "@/lib/notifications/templates";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  const client = new LineClient();
  const sigOk = await client.verifySignature(body, signature); if (!sigOk) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const events = client.parseWebhook(JSON.parse(body));
  const responses: string[] = [];

  for (const event of events) {
    if (event.type === "message" && event.message?.type === "text") {
      const text = event.message.text.trim().toLowerCase();

      let action = "acknowledged";
      if (text.includes("entry") || text.includes("enter")) action = "entered";
      else if (text.includes("pass") || text.includes("skip")) action = "passed";
      else if (text.includes("defer") || text.includes("hold")) action = "deferred";

      // Extract symbol from message (e.g., "entry 7203" or "pass 6758.T")
      const symMatch = text.match(/(\d{4,5}(?:\.T)?)/i);
      const symbol = symMatch ? symMatch[1] : "unknown";
      const tier = "B";

      const reply = buildWebhookReply(action, symbol, tier);
      responses.push(reply);

      if (event.replyToken) {
        // In production, use LINE reply API here
        console.log(`[LINE] Would reply to ${event.source?.userId}: ${reply}`);
      }
    }
  }

  return NextResponse.json({ received: events.length, responses });
}
