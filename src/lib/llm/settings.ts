import crypto from "crypto";
import { createClient } from "../supabase/server";
import { ChatCompletionsProvider } from "./chat-completions-provider";
import type { OrchestratorConfig } from "./orchestrator";
import type { ConfiguredLlmProvider } from "./providers";
import type { LlmProvider } from "./types";

export interface LlmSettingsView {
  provider: ConfiguredLlmProvider;
  baseUrl: string;
  reasoningModel: string;
  workerModel: string;
  criticModel: string;
  reasoningTemperature: number;
  criticTemperature: number;
  enableCritic: boolean;
  apiKeySet: boolean;
  apiKeyPreview: string | null;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  dailyCostLimitUsd: number;
  source: "database" | "environment";
}

export interface LlmSettingsInput {
  provider: ConfiguredLlmProvider;
  baseUrl?: string;
  reasoningModel: string;
  workerModel: string;
  criticModel: string;
  reasoningTemperature: number;
  criticTemperature: number;
  enableCritic: boolean;
  apiKey?: string;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  dailyCostLimitUsd: number;
}

interface LlmSettingsRow {
  provider: ConfiguredLlmProvider;
  base_url: string | null;
  reasoning_model: string;
  worker_model: string;
  critic_model: string;
  reasoning_temperature: number;
  critic_temperature: number;
  enable_critic: boolean;
  api_key_ciphertext: string | null;
  api_key_preview: string | null;
  input_cost_per_million: number;
  output_cost_per_million: number;
  daily_cost_limit_usd: number;
}

export async function getLlmSettingsView(): Promise<LlmSettingsView> {
  const row = await getStoredSettingsRow();
  if (!row) return envSettingsView();
  return {
    provider: row.provider,
    baseUrl: row.base_url ?? defaultBaseUrl(row.provider),
    reasoningModel: row.reasoning_model,
    workerModel: row.worker_model,
    criticModel: row.critic_model,
    reasoningTemperature: Number(row.reasoning_temperature),
    criticTemperature: Number(row.critic_temperature),
    enableCritic: row.enable_critic,
    apiKeySet: Boolean(row.api_key_ciphertext),
    apiKeyPreview: row.api_key_preview,
    inputCostPerMillion: Number(row.input_cost_per_million),
    outputCostPerMillion: Number(row.output_cost_per_million),
    dailyCostLimitUsd: Number(row.daily_cost_limit_usd),
    source: "database",
  };
}

export async function saveLlmSettings(input: LlmSettingsInput): Promise<LlmSettingsView> {
  const existing = await getStoredSettingsRow();
  const apiKey = input.apiKey?.trim();
  const encrypted = apiKey ? encryptSecret(apiKey) : existing?.api_key_ciphertext ?? null;
  const preview = apiKey ? maskKey(apiKey) : existing?.api_key_preview ?? null;
  const supabase = await createClient();
  const { error } = await supabase.from("llm_settings").upsert({
    id: "default",
    provider: input.provider,
    base_url: input.baseUrl?.trim() || defaultBaseUrl(input.provider),
    reasoning_model: input.reasoningModel.trim(),
    worker_model: input.workerModel.trim(),
    critic_model: input.criticModel.trim(),
    reasoning_temperature: input.reasoningTemperature,
    critic_temperature: input.criticTemperature,
    enable_critic: input.enableCritic,
    api_key_ciphertext: encrypted,
    api_key_preview: preview,
    input_cost_per_million: input.inputCostPerMillion,
    output_cost_per_million: input.outputCostPerMillion,
    daily_cost_limit_usd: input.dailyCostLimitUsd,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) throw new Error(`saveLlmSettings: ${error.message}`);
  return getLlmSettingsView();
}

export async function getLlmRuntimeConfig(): Promise<{ provider: LlmProvider; config: OrchestratorConfig; settings: LlmSettingsView }> {
  const row = await getStoredSettingsRow();
  const settings = row ? await getLlmSettingsView() : envSettingsView();
  const apiKey = row?.api_key_ciphertext ? decryptSecret(row.api_key_ciphertext) : envApiKey(settings.provider);
  const provider = new ChatCompletionsProvider({
    providerType: settings.provider === "deepseek" ? "deepseek" : "openai-compatible",
    apiKey,
    baseUrl: settings.baseUrl,
    missingKeyMessage: `${settings.provider} API key is not set`,
    inputTokenCostPerMillion: settings.inputCostPerMillion,
    outputTokenCostPerMillion: settings.outputCostPerMillion,
  });
  return {
    provider,
    config: {
      enableCritic: settings.enableCritic,
      reasoningModel: settings.reasoningModel,
      workerModel: settings.workerModel,
      criticModel: settings.criticModel,
      reasoningTemperature: settings.reasoningTemperature,
      criticTemperature: settings.criticTemperature,
    },
    settings,
  };
}

export async function testLlmSettings(input?: LlmSettingsInput): Promise<{ ok: boolean; latencyMs: number; model: string; error?: string }> {
  const start = Date.now();
  try {
    let provider: LlmProvider;
    let model: string;
    if (input) {
      const apiKey = input.apiKey?.trim() || envApiKey(input.provider);
      provider = new ChatCompletionsProvider({
        providerType: input.provider === "deepseek" ? "deepseek" : "openai-compatible",
        apiKey,
        baseUrl: input.baseUrl?.trim() || defaultBaseUrl(input.provider),
        missingKeyMessage: `${input.provider} API key is not set`,
        inputTokenCostPerMillion: input.inputCostPerMillion,
        outputTokenCostPerMillion: input.outputCostPerMillion,
      });
      model = input.workerModel || input.reasoningModel;
    } else {
      const runtime = await getLlmRuntimeConfig();
      provider = runtime.provider;
      model = runtime.settings.workerModel;
    }
    const result = await provider.chatCompletion({
      model,
      messages: [{ role: "user", content: "Return only this JSON: {\"ok\":true}" }],
      temperature: 0,
      maxTokens: 32,
      responseFormat: { type: "json_object" },
    });
    return { ok: result.content.includes("ok"), latencyMs: Date.now() - start, model: result.model };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - start, model: input?.workerModel ?? "", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function getStoredSettingsRow(): Promise<LlmSettingsRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("llm_settings").select("*").eq("id", "default").maybeSingle();
  if (error) return null;
  return data as LlmSettingsRow | null;
}

function envSettingsView(): LlmSettingsView {
  const provider = process.env.LLM_PROVIDER === "openai-compatible" ? "openai-compatible" : "deepseek";
  return {
    provider,
    baseUrl: provider === "deepseek" ? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com" : process.env.LLM_BASE_URL ?? "",
    reasoningModel: process.env.LLM_REASONING_MODEL ?? process.env.LLM_MODEL ?? "deepseek-chat",
    workerModel: process.env.LLM_WORKER_MODEL ?? process.env.LLM_MODEL ?? "deepseek-chat",
    criticModel: process.env.LLM_CRITIC_MODEL ?? process.env.LLM_REASONING_MODEL ?? process.env.LLM_MODEL ?? "deepseek-chat",
    reasoningTemperature: Number(process.env.LLM_REASONING_TEMPERATURE ?? 0.3),
    criticTemperature: Number(process.env.LLM_CRITIC_TEMPERATURE ?? 0.5),
    enableCritic: process.env.LLM_ENABLE_CRITIC === "true",
    apiKeySet: Boolean(envApiKey(provider)),
    apiKeyPreview: envApiKey(provider) ? "環境変数で設定済み" : null,
    inputCostPerMillion: Number(process.env.LLM_INPUT_COST_PER_MILLION ?? 0),
    outputCostPerMillion: Number(process.env.LLM_OUTPUT_COST_PER_MILLION ?? 0),
    dailyCostLimitUsd: Number(process.env.DAILY_LLM_COST_LIMIT_USD ?? 3),
    source: "environment",
  };
}

function envApiKey(provider: ConfiguredLlmProvider): string {
  return provider === "deepseek" ? process.env.DEEPSEEK_API_KEY ?? "" : process.env.LLM_API_KEY ?? "";
}

function defaultBaseUrl(provider: ConfiguredLlmProvider): string {
  return provider === "deepseek" ? "https://api.deepseek.com" : "https://api.openai.com";
}

function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptSecret(value: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64")), decipher.final()]).toString("utf8");
}

function encryptionKey(): Buffer {
  const seed = process.env.APP_SETTINGS_ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "signal-local-dev-settings-key";
  return crypto.createHash("sha256").update(seed).digest();
}

function maskKey(value: string): string {
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
