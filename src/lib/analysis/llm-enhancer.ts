import { LlmOrchestrator } from "../llm/orchestrator";
import type { LlmInputSnapshot } from "../llm/types";
import { applyLlmAdjustment } from "../scoring/scoring-engine";
import { detectSignal } from "../scoring/signal-detector";
import { SIGNAL_THRESHOLDS } from "../scoring/config";
import type { LlmScoreAdjustment } from "../scoring/types";
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
    scoreContributions: logic.scores.contributions,
    gateDetails: logic.classification.gateDetails,
    decisionReasons: logic.classification.reasons,
    strategyTags: logic.scores.strategyTags,
    scenario: logic.classification.scenario
      ? {
          entryPrice: logic.classification.scenario.entryPrice,
          stopPrice: logic.classification.scenario.stopPrice,
          targetBase: logic.classification.scenario.targetBase,
          riskRewardBase: logic.classification.scenario.riskRewardBase,
          expectedHoldingPeriod: logic.classification.scenario.expectedHoldingPeriod,
          calculationMethod: logic.classification.scenario.calculationMethod,
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

    const rawAdjustment = llm.analysis.score_adjustments;
    const adjustment = sanitizeLlmScoreAdjustment(subject, logic, {
      opportunity: rawAdjustment.opportunity,
      entryTiming: rawAdjustment.entry_timing,
      risk: rawAdjustment.risk,
      conviction: rawAdjustment.conviction,
      reason: rawAdjustment.reason,
    });
    const scores = applyLlmAdjustment(logic.scores, adjustment);
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

export function sanitizeLlmScoreAdjustment(subject: AnalysisSubject, logic: LogicAnalysisResult, adjustment: LlmScoreAdjustment): LlmScoreAdjustment {
  const guarded = { ...adjustment };
  const guardReasons: string[] = [];
  const hardBlocker = subject.isForbidden || subject.eventBlockerActive || subject.dataConfidence < SIGNAL_THRESHOLDS.dataConfidenceMinimum;
  const highRisk = logic.scores.riskScore >= SIGNAL_THRESHOLDS.riskWatchMaximum;

  if (hardBlocker || highRisk) {
    if (guarded.opportunity > 0) guarded.opportunity = 0;
    if (guarded.entryTiming > 0) guarded.entryTiming = 0;
    if (guarded.conviction > 0) guarded.conviction = 0;
    if (guarded.risk < 0) guarded.risk = 0;
    if (subject.isForbidden) guardReasons.push("forbidden symbol blocks positive LLM adjustments");
    if (subject.eventBlockerActive) guardReasons.push("event blocker blocks positive LLM adjustments");
    if (subject.dataConfidence < SIGNAL_THRESHOLDS.dataConfidenceMinimum) guardReasons.push("low data confidence blocks positive LLM adjustments");
    if (highRisk) guardReasons.push("high risk score blocks positive LLM adjustments");
  }

  if (logic.classification.action === "avoid") {
    guarded.opportunity = Math.min(guarded.opportunity, 0);
    guarded.entryTiming = Math.min(guarded.entryTiming, 0);
    guarded.conviction = Math.min(guarded.conviction, 0);
    guardReasons.push("avoid classification blocks upgrades from LLM");
  }

  if (guardReasons.length === 0) return guarded;
  return { ...guarded, reason: `${adjustment.reason} | Guarded: ${guardReasons.join("; ")}` };
}
