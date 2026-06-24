import type { LlmProvider, LlmInputSnapshot, ReasoningOutput, CriticOutput, LlmOrchestrationResult, LlmRunResult } from "./types";
import { createLlmProvider } from "./providers";
import { REASONING_SCHEMA, CRITIC_SCHEMA, validateSchema, extractJson } from "./schemas";
import { buildReasoningPrompt, buildCriticPrompt, buildRepairPrompt } from "./prompts";

export interface OrchestratorConfig {
  enableCritic?: boolean; maxRepairAttempts?: number;
  reasoningModel?: string; workerModel?: string;
  criticModel?: string;
  reasoningTemperature?: number; criticTemperature?: number;
}

const DEFAULTS = {
  enableCritic: false,
  maxRepairAttempts: 2,
  reasoningModel: process.env.LLM_REASONING_MODEL ?? process.env.LLM_MODEL ?? "deepseek-chat",
  workerModel: process.env.LLM_WORKER_MODEL ?? process.env.LLM_MODEL ?? "deepseek-chat",
  criticModel: process.env.LLM_CRITIC_MODEL ?? process.env.LLM_REASONING_MODEL ?? process.env.LLM_MODEL ?? "deepseek-chat",
  reasoningTemperature: Number(process.env.LLM_REASONING_TEMPERATURE ?? 0.3),
  criticTemperature: Number(process.env.LLM_CRITIC_TEMPERATURE ?? 0.5),
};

function empty(status: LlmRunResult["status"] = "pending"): LlmRunResult {
  return { status, outputJson: null, outputText: null, inputTokens: 0, outputTokens: 0, estimatedCost: 0, latencyMs: 0, errorMessage: null, repairAttemptCount: 0 };
}

export class LlmOrchestrator {
  private provider: LlmProvider;
  private config: Required<OrchestratorConfig>;

  constructor(provider?: LlmProvider, config?: OrchestratorConfig) {
    this.provider = provider ?? createLlmProvider();
    this.config = { ...DEFAULTS, ...config };
  }

  async analyze(input: LlmInputSnapshot): Promise<LlmOrchestrationResult> {
    const result: LlmOrchestrationResult = { reasoning: empty("pending"), analysis: null, criticOutput: null, repaired: false, repairAttempted: false };
    const r = await this.runReasoning(input);
    result.reasoning = r;
    if (r.status === "failed") return result;
    const parsed = r.outputJson;
    const ve = validateSchema(parsed, REASONING_SCHEMA);
    if (ve !== null) {
      result.repairAttempted = true;
      const fixed = await this.runRepair(r.outputText ?? JSON.stringify(parsed), input);
      if (fixed.status === "repaired" || fixed.status === "completed") {
        result.reasoning = fixed; result.repaired = true; result.analysis = fixed.outputJson as ReasoningOutput;
      } else { result.reasoning = { ...r, status: "failed" }; return result; }
    } else { result.analysis = parsed as ReasoningOutput; }
    const shouldCritic = this.config.enableCritic || result.analysis?.action_suggestion === "strong_entry_candidate";
    if (shouldCritic && result.analysis) {
      const cr = await this.runCritic(result.analysis, input);
      result.critic = cr;
      if (cr.status === "completed") result.criticOutput = cr.outputJson as CriticOutput;
    }
    return result;
  }

  private async runReasoning(input: LlmInputSnapshot): Promise<LlmRunResult> {
    try {
      const prompt = buildReasoningPrompt(input);
      const r = await this.provider.chatCompletion({ model: this.config.reasoningModel, messages: [{ role: "system", content: "You are a precise financial analysis model. Always respond with valid JSON only." }, { role: "user", content: prompt }], temperature: this.config.reasoningTemperature, maxTokens: 4096, responseFormat: { type: "json_object" } });
      const parsed = extractJson(r.content);
      return { status: parsed !== null ? "completed" : "failed", outputJson: parsed, outputText: r.content, inputTokens: r.inputTokens, outputTokens: r.outputTokens, estimatedCost: r.estimatedCost, latencyMs: r.latencyMs, errorMessage: parsed === null ? "Failed to parse JSON" : null, model: r.model, finishReason: r.finishReason ?? null, requestId: r.requestId ?? null, repairAttemptCount: 0 };
    } catch (e) { return { ...empty("failed"), errorMessage: e instanceof Error ? e.message : "Unknown error" }; }
  }

  private async runRepair(broken: string, input: LlmInputSnapshot, attempt: number = 1): Promise<LlmRunResult> {
    try {
      const sd = JSON.stringify(REASONING_SCHEMA, null, 2);
      const prompt = buildRepairPrompt(broken, sd);
      const r = await this.provider.chatCompletion({ model: this.config.workerModel, messages: [{ role: "system", content: "JSON repair specialist." }, { role: "user", content: prompt }], temperature: 0.0, maxTokens: 4096 });
      const fixed = extractJson(r.content);
      if (fixed === null) { if (attempt < this.config.maxRepairAttempts) return this.runRepair(r.content, input, attempt + 1); return { ...empty("failed"), errorMessage: "Repair failed" }; }
      const ve = validateSchema(fixed, REASONING_SCHEMA);
      if (ve !== null) { if (attempt < this.config.maxRepairAttempts) return this.runRepair(JSON.stringify(fixed), input, attempt + 1); return { ...empty("failed"), errorMessage: ve.join("; ") }; }
      return { status: "repaired", outputJson: fixed, outputText: r.content, inputTokens: r.inputTokens, outputTokens: r.outputTokens, estimatedCost: r.estimatedCost, latencyMs: r.latencyMs, errorMessage: null, model: r.model, finishReason: r.finishReason ?? null, requestId: r.requestId ?? null, repairAttemptCount: attempt };
    } catch (e) { return { ...empty("failed"), errorMessage: `Repair error: ${e instanceof Error ? e.message : "Unknown"}` }; }
  }

  private async runCritic(reasoning: ReasoningOutput, input: LlmInputSnapshot): Promise<LlmRunResult> {
    try {
      const prompt = buildCriticPrompt(reasoning, input);
      const r = await this.provider.chatCompletion({ model: this.config.criticModel, messages: [{ role: "system", content: "Critical reviewer." }, { role: "user", content: prompt }], temperature: this.config.criticTemperature, maxTokens: 2048, responseFormat: { type: "json_object" } });
      const parsed = extractJson(r.content);
      if (parsed === null) return { ...empty("failed"), errorMessage: "Failed to parse critic" };
      const ve = validateSchema(parsed, CRITIC_SCHEMA);
      if (ve !== null) return { ...empty("failed"), errorMessage: ve.join("; ") };
      return { status: "completed", outputJson: parsed, outputText: r.content, inputTokens: r.inputTokens, outputTokens: r.outputTokens, estimatedCost: r.estimatedCost, latencyMs: r.latencyMs, errorMessage: null, model: r.model, finishReason: r.finishReason ?? null, requestId: r.requestId ?? null, repairAttemptCount: 0 };
    } catch (e) { return { ...empty("failed"), errorMessage: `Critic error: ${e instanceof Error ? e.message : "Unknown"}` }; }
  }
}
