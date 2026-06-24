import { NextResponse } from "next/server";
import { testLlmSettings } from "@/lib/llm/settings";
import { requireAdminRequest } from "@/lib/api/auth";
import { errorResponse } from "@/lib/api/response";

export async function POST(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json().catch(() => undefined);
    return NextResponse.json(await testLlmSettings(body));
  } catch (error) {
    return errorResponse("llm_settings_test_failed", error instanceof Error ? error.message : "Failed to test LLM settings", 500);
  }
}
