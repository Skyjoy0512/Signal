import { NextResponse } from "next/server";
import { testLlmSettings } from "@/lib/llm/settings";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => undefined);
    return NextResponse.json(await testLlmSettings(body));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to test LLM settings" }, { status: 500 });
  }
}
