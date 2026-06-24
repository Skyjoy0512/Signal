import type { LayerCondition, SymbolSnapshot } from "../intelligence/types";
import type { LlmOrchestrationResult, LlmProvider } from "../llm/types";
import type { ScoringInput, ScoringOutput, SignalClassification } from "../scoring/types";

export interface AnalysisSubject {
  symbol: string;
  name?: string | null;
  snapshot: SymbolSnapshot;
  market: LayerCondition | null;
  sector: LayerCondition | null;
  theme: LayerCondition | null;
  symbolLayer: LayerCondition | null;
  dataConfidence: number;
  eventBlockerActive: boolean;
  isForbidden: boolean;
  fundamentals?: ScoringInput["fundamentals"];
  priceHistory?: Array<{ close: number }>;
}

export interface AnalysisInputSnapshotV1 {
  schemaVersion: "analysis-input-v1";
  scoreEngineVersion: string;
  scoringConfigVersion: string;
  capturedAt: string;
  symbol: string;
  symbolName?: string;
  marketDataAsOf?: string;
  dataSources: Array<{ name: string; asOf?: string; confidence?: number }>;
  features: {
    technical: unknown;
    fundamentals?: unknown;
    layers: unknown;
    events?: unknown;
  };
  featureAvailability: Record<string, boolean>;
  scenarioQuality?: {
    atrSource: "actual" | "estimated" | "unavailable";
    confidence: number;
    warnings: string[];
  };
}

export interface LogicAnalysisResult {
  scores: ScoringOutput;
  classification: SignalClassification;
  scoringInput: ScoringInput;
}

export interface LlmEnhancementResult {
  scores: ScoringOutput;
  classification: SignalClassification;
  llm: LlmOrchestrationResult | null;
  costUsd: number;
}

export interface InvestmentAnalysisResult extends LogicAnalysisResult {
  llm: LlmOrchestrationResult | null;
  costUsd: number;
}

export interface AnalysisLogicEngine {
  analyze(subject: AnalysisSubject): LogicAnalysisResult;
}

export interface LlmEnhancer {
  enhance(subject: AnalysisSubject, logic: LogicAnalysisResult): Promise<LlmEnhancementResult>;
}

export interface LlmEnhancerConfig {
  enabled?: boolean;
  provider?: LlmProvider;
  enableCritic?: boolean;
  maxRepairAttempts?: number;
  reasoningModel?: string;
  workerModel?: string;
  reasoningTemperature?: number;
  criticTemperature?: number;
}
