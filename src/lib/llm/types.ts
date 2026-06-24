import type { ScoreContribution } from "../scoring/types";
import type { ScenarioQuality, SignalDecisionReason, SignalGateDetail } from "../scoring/types";
import type { AnalysisInputSnapshotV1 } from "../analysis/types";

export type LlmProviderType = "deepseek" | "openai-compatible";
export type LlmModelRole = "reasoning" | "critic" | "worker";
export type LlmRunStatus = "pending" | "running" | "completed" | "failed" | "repaired";

export interface LlmInputSnapshot {
  schemaVersion: "analysis-input-v1";
  scoreEngineVersion: string;
  scoringConfigVersion: string;
  capturedAt: string;
  symbol: string; symbolName?: string;
  inputSnapshot?: AnalysisInputSnapshotV1;
  scores: { opportunity: number; entryTiming: number; risk: number; conviction: number; finalEntry: number; };
  scoreContributions?: {
    opportunity: ScoreContribution[];
    entryTiming: ScoreContribution[];
    risk: ScoreContribution[];
    conviction: ScoreContribution[];
    finalEntry: ScoreContribution[];
  };
  gateDetails?: SignalGateDetail[];
  decisionReasons?: SignalDecisionReason[];
  strategyTags: string[];
  scenario?: { entryPrice: number; stopPrice: number; targetBase: number; riskRewardBase: number; expectedHoldingPeriod?: string; calculationMethod?: string; scenarioQuality?: ScenarioQuality; };
  layers: { market?: LlmLayerSnapshot; sector?: LlmLayerSnapshot; theme?: LlmLayerSnapshot; symbol?: LlmLayerSnapshot; };
  dataConfidence: number; eventBlockerActive: boolean;
}

export interface LlmLayerSnapshot { layerName: string; scopeKey: string; condition: string; trend: string; strength: number; risk: number; confidence: number; impact: string; reason: string; }

export interface ReasoningOutput {
  action_suggestion: "strong_entry_candidate" | "entry_candidate" | "watch" | "wait_for_pullback" | "avoid";
  confidence: number; bull_case: string; bear_case: string;
  key_risks: string[]; do_not_enter_if: string[]; invalidation_condition: string;
  target_review: { conservative_target_is_reasonable: boolean; base_target_is_reasonable: boolean; bull_target_is_reasonable: boolean; comment: string; };
  stop_review: { stop_is_reasonable: boolean; comment: string; };
  score_adjustments: { opportunity: number; entry_timing: number; risk: number; conviction: number; reason: string; };
  evidence_refs: EvidenceRef[];
  final_comment: string;
}

export type EvidenceRefType = "gate" | "contribution" | "scenario" | "score" | "feature" | "layer" | "decision_reason";
export interface EvidenceRef { type: EvidenceRefType; key?: string; component?: string; feature?: string; field?: string; }

export interface CriticOutput {
  critic_pass: boolean;
  major_concerns: string[];
  required_downgrade: boolean;
  downgrade_to: "entry_candidate" | "watch" | "avoid" | null;
  block_positive_adjustment: boolean;
  reasons: string[];
  evidence_refs: EvidenceRef[];
  reason: string;
}

export interface LlmProvider { readonly providerType: LlmProviderType; chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult>; }
export interface ChatCompletionParams { model: string; messages: ChatMessage[]; temperature?: number; maxTokens?: number; responseFormat?: { type: "json_object" }; }
export interface ChatMessage { role: "system" | "user" | "assistant"; content: string; }
export interface ChatCompletionResult { content: string; inputTokens: number; outputTokens: number; estimatedCost: number; latencyMs: number; model: string; finishReason?: string | null; requestId?: string | null; }

export interface LlmOrchestrationResult { reasoning: LlmRunResult; critic?: LlmRunResult; analysis: ReasoningOutput | null; criticOutput: CriticOutput | null; repaired: boolean; repairAttempted: boolean; }
export interface LlmRunResult {
  status: LlmRunStatus;
  outputJson: unknown;
  outputText: string | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  latencyMs: number;
  errorMessage: string | null;
  model?: string | null;
  finishReason?: string | null;
  requestId?: string | null;
  repairAttemptCount?: number;
}
