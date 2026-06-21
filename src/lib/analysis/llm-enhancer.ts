import { LlmOrchestrator } from "../llm/orchestrator";
import type { LlmInputSnapshot } from "../llm/types";
import { applyLlmAdjustment } from "../scoring/scoring-engine";
import { detectSignal } from "../scoring/signal-detector";
import type { LayerCondition } from "../intelligence/types";
import type { AnalysisSubject, LlmEnhancer, LlmEnhancerConfig, LlmEnhancementResult, LogicAnalysisResult } from "./types";

function layerSnapshot(layer: LayerCondition | null | undefined, fallbackName: string): LlmInputSnapshot["layers"]["market"] {
  if (!layer) return undefined;
  return {
    layerName: layer.layer_name ?? fallbackName,
    scopeKey: layer.scope_key,
    condition: layer.condition,
    trend: layer.trend,
    strength: layer.strength,
    risk: layer.risk,
    confidence: layer.confidence,
    impact: layer.impact,
    reason: layer.reason,
  };
}

export function buildLlmInputSnapshot(subject: AnalysisSubject, logic: LogicAnalysisResult): LlmInputSnapshot {
  return {
    symbol: subject.symbol,
    symbolName: subject.name ?? undefined,
    scores: {
      opportunity: logic.scores.opportunityScore,
      entryTiming: logic.scores.entryTimingScore,
      risk: logic.scores.riskScore,
      conviction: logic.scores.convictionScore,
      finalEntry: logic.scores.finalEntryScore,
    },
    strategyTags: logic.scores.strategyTags,
    scenario: logic.classification.scenario
      ? {
          entryPrice: logic.classification.scenario.entryPrice,
          stopPrice: logic.classification.scenario.stopPrice,
          targetBase: logic.classification.scenario.targetBase,
          riskRewardBase: logic.classification.scenario.riskRewardBase,
        }
      : undefined,
    layers: {
      market: layerSnapshot(subject.market, "market"),
      sector: layerSnapshot(subject.sector, "sector"),
      theme: layerSnapshot(subject.theme, "theme"),
      symbol: layerSnapshot(subject.symbolLayer, "symbol"),
    },
    dataConfidence: subject.dataConfidence,
    eventBlockerActive: subject.eventBlockerActive,
  };
}

export class LlmScoreEnhancer implements LlmEnhancer {
  private readonly enabled: boolean;
  private readonly orchestrator: LlmOrchestrator;

  constructor(config: LlmEnhancerConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.orchestrator = new LlmOrchestrator(config.provider, config);
  }

  async enhance(subject: AnalysisSubject, logic: LogicAnalysisResult): Promise<LlmEnhancementResult> {
    if (!this.enabled) {
      return { scores: logic.scores, classification: logic.classification, llm: null, costUsd: 0 };
    }

    const llmInput = buildLlmInputSnapshot(subject, logic);
    const llm = await this.orchestrator.analyze(llmInput);
    const costUsd = (llm.reasoning?.estimatedCost ?? 0) + (llm.critic?.estimatedCost ?? 0);
    if (!llm.analysis) {
      return { scores: logic.scores, classification: logic.classification, llm, costUsd };
    }

    const adjustment = llm.analysis.score_adjustments;
    const scores = applyLlmAdjustment(logic.scores, {
      opportunity: adjustment.opportunity,
      entryTiming: adjustment.entry_timing,
      risk: adjustment.risk,
      conviction: adjustment.conviction,
      reason: adjustment.reason,
    });
    const classification = detectSignal({
      scores,
      snapshot: subject.snapshot,
      market: subject.market,
      symbol: subject.symbolLayer,
      dataConfidence: subject.dataConfidence,
      eventBlockerActive: subject.eventBlockerActive,
      isForbidden: subject.isForbidden,
      entryPrice: subject.snapshot.close,
    });

    return { scores, classification, llm, costUsd };
  }
}
