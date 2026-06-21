import { ChatCompletionsProvider } from "./chat-completions-provider";
import { DeepSeekProvider } from "./deepseek";
import type { LlmProvider } from "./types";

export type ConfiguredLlmProvider = "deepseek" | "openai-compatible";

export function createLlmProvider(provider: ConfiguredLlmProvider = configuredProviderFromEnv()): LlmProvider {
  if (provider === "openai-compatible") {
    return new ChatCompletionsProvider({
      providerType: "openai-compatible",
      apiKey: process.env.LLM_API_KEY ?? "",
      baseUrl: process.env.LLM_BASE_URL ?? "",
      missingKeyMessage: "LLM_API_KEY is not set",
      inputTokenCostPerMillion: Number(process.env.LLM_INPUT_COST_PER_MILLION ?? 0),
      outputTokenCostPerMillion: Number(process.env.LLM_OUTPUT_COST_PER_MILLION ?? 0),
    });
  }
  return new DeepSeekProvider();
}

function configuredProviderFromEnv(): ConfiguredLlmProvider {
  return process.env.LLM_PROVIDER === "openai-compatible" ? "openai-compatible" : "deepseek";
}
