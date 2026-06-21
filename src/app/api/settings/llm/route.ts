import { NextResponse } from "next/server";
import { getLlmSettingsView, saveLlmSettings, type LlmSettingsInput } from "@/lib/llm/settings";

export async function GET() {
  try {
    return NextResponse.json(await getLlmSettingsView());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load LLM settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = normalizeInput(body);
    return NextResponse.json(await saveLlmSettings(input));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save LLM settings" }, { status: 400 });
  }
}

function normalizeInput(body: Record<string, unknown>): LlmSettingsInput {
  const provider = body.provider === "openai-compatible" ? "openai-compatible" : "deepseek";
  const reasoningModel = stringValue(body.reasoningModel);
  const workerModel = stringValue(body.workerModel);
  const criticModel = stringValue(body.criticModel);
  if (!reasoningModel || !workerModel || !criticModel) throw new Error("Model names are required");
  return {
    provider,
    baseUrl: stringValue(body.baseUrl),
    reasoningModel,
    workerModel,
    criticModel,
    reasoningTemperature: numberValue(body.reasoningTemperature, 0.3),
    criticTemperature: numberValue(body.criticTemperature, 0.5),
    enableCritic: Boolean(body.enableCritic),
    apiKey: stringValue(body.apiKey),
    inputCostPerMillion: numberValue(body.inputCostPerMillion, 0),
    outputCostPerMillion: numberValue(body.outputCostPerMillion, 0),
    dailyCostLimitUsd: numberValue(body.dailyCostLimitUsd, 3),
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
