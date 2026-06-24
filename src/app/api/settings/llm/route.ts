import { NextResponse } from "next/server";
import { getLlmSettingsView, saveLlmSettings, type LlmSettingsInput } from "@/lib/llm/settings";
import { requireAdminRequest } from "@/lib/api/auth";
import { errorResponse } from "@/lib/api/response";

export async function GET(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json(await getLlmSettingsView());
  } catch (error) {
    return errorResponse("llm_settings_load_failed", error instanceof Error ? error.message : "Failed to load LLM settings", 500);
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const input = normalizeInput(body);
    return NextResponse.json(await saveLlmSettings(input));
  } catch (error) {
    return errorResponse("llm_settings_invalid", error instanceof Error ? error.message : "Failed to save LLM settings", 400);
  }
}

function normalizeInput(body: Record<string, unknown>): LlmSettingsInput {
  if (body.provider !== "deepseek" && body.provider !== "openai-compatible") throw new Error("Invalid LLM provider");
  const provider = body.provider;
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
