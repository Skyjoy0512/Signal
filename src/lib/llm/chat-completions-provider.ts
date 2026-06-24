import type { LlmProvider, ChatCompletionParams, ChatCompletionResult, LlmProviderType } from "./types";

export interface ChatCompletionsProviderConfig {
  providerType: LlmProviderType;
  apiKey: string;
  baseUrl: string;
  missingKeyMessage: string;
  inputTokenCostPerMillion?: number;
  outputTokenCostPerMillion?: number;
}

export class ChatCompletionsProvider implements LlmProvider {
  readonly providerType: LlmProviderType;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly missingKeyMessage: string;
  private readonly inputTokenCostPerMillion: number;
  private readonly outputTokenCostPerMillion: number;

  constructor(config: ChatCompletionsProviderConfig) {
    this.providerType = config.providerType;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.missingKeyMessage = config.missingKeyMessage;
    this.inputTokenCostPerMillion = config.inputTokenCostPerMillion ?? 0;
    this.outputTokenCostPerMillion = config.outputTokenCostPerMillion ?? 0;
  }

  async chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    if (!this.apiKey) throw new Error(this.missingKeyMessage);
    const startTime = Date.now();
    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 4096,
      stream: false,
    };
    if (params.responseFormat?.type === "json_object") body.response_format = { type: "json_object" };
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });
    const latencyMs = Date.now() - startTime;
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`${this.providerType} API error ${response.status}: ${text}`);
    }
    const json = await response.json();
    const choice = json.choices?.[0];
    if (!choice) throw new Error("No choices in response");
    const content = choice.message?.content ?? "";
    const inputTokens = json.usage?.prompt_tokens ?? 0;
    const outputTokens = json.usage?.completion_tokens ?? 0;
    const estimatedCost = (inputTokens / 1_000_000) * this.inputTokenCostPerMillion + (outputTokens / 1_000_000) * this.outputTokenCostPerMillion;
    return {
      content,
      inputTokens,
      outputTokens,
      estimatedCost: Math.round(estimatedCost * 1_000_000) / 1_000_000,
      latencyMs,
      model: params.model,
      finishReason: choice.finish_reason ?? null,
      requestId: typeof json.id === "string" ? json.id : null,
    };
  }
}
