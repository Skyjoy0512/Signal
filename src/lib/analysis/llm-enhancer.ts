import { LlmOrchestrator } from "../llm/orchestrator";
import type { CriticOutput, LlmInputSnapshot } from "../llm/types";
import { applyLlmAdjustment } from "../scoring/scoring-engine";
import { detectSignal } from "../scoring/signal-detector";
import { SCORE_ENGINE_VERSION, SCORING_CONFIG_VERSION, SIGNAL_THRESHOLDS } from "../scoring/config";
import type { LlmScoreAdjustment } from "../scoring/types";
import type { LayerCondition } from "../intelligence/types";
import type { AnalysisInputSnapshotV1, AnalysisSubject, LlmEnhancer, LlmEnhancerConfig, LlmEnhancementResult, LogicAnalysisResult } from "./types";

const MAX_OPTIMISTIC_ADJUSTMENT = 5;
const MAX_PESSIMISTIC_ADJUSTMENT = 10;
const LOW_LLM_CONFIDENCE_THRESHOLD = 50;

function isLayerCondition(layer: LayerCondition | null | undefined): layer is LayerCondition {
  return Boolean(layer);
}

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
  const inputSnapshot = buildAnalysisInputSnapshot(subject, logic);
  return {
    schemaVersion: inputSnapshot.schemaVersion,
    scoreEngineVersion: inputSnapshot.scoreEngineVersion,
    scoringConfigVersion: inputSnapshot.scoringConfigVersion,
    capturedAt: inputSnapshot.capturedAt,
    symbol: subject.symbol,
    symbolName: subject.name ?? undefined,
    inputSnapshot,
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
          scenarioQuality: logic.classification.scenario.scenarioQuality,
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

export function buildAnalysisInputSnapshot(subject: AnalysisSubject, logic: LogicAnalysisResult): AnalysisInputSnapshotV1 {
  const capturedAt = subject.symbolLayer?.captured_at ?? subject.market?.captured_at ?? new Date().toISOString();
  const marketDataAsOf = subject.symbolLayer?.captured_at ?? subject.market?.captured_at;
  const scenario = logic.classification.scenario;
  return {
    schemaVersion: "analysis-input-v1",
    scoreEngineVersion: SCORE_ENGINE_VERSION,
    scoringConfigVersion: SCORING_CONFIG_VERSION,
    capturedAt,
    symbol: subject.symbol,
    symbolName: subject.name ?? undefined,
    marketDataAsOf,
    dataSources: [
      { name: "ohlcv", asOf: marketDataAsOf, confidence: subject.dataConfidence },
      ...[subject.market, subject.sector, subject.theme, subject.symbolLayer].filter(isLayerCondition).map((layer) => ({
        name: `layer:${layer.layer_name}`,
        asOf: layer.captured_at,
        confidence: layer.confidence,
      })),
    ],
    features: {
      technical: subject.snapshot,
      fundamentals: subject.fundamentals,
      layers: {
        market: layerSnapshot(subject.market, "market"),
        sector: layerSnapshot(subject.sector, "sector"),
        theme: layerSnapshot(subject.theme, "theme"),
        symbol: layerSnapshot(subject.symbolLayer, "symbol"),
      },
      events: { eventBlockerActive: subject.eventBlockerActive, isForbidden: subject.isForbidden },
    },
    featureAvailability: {
      technical: true,
      fundamentals: Boolean(subject.fundamentals),
      marketLayer: Boolean(subject.market),
      sectorLayer: Boolean(subject.sector),
      themeLayer: Boolean(subject.theme),
      symbolLayer: Boolean(subject.symbolLayer),
      scenario: Boolean(scenario),
      priceHistory: Boolean(subject.priceHistory?.length),
      ...logic.scores.featureAvailability,
    },
    scenarioQuality: {
      atrSource: scenario?.scenarioQuality.atrSource ?? "unavailable",
      confidence: scenario?.scenarioQuality.confidence ?? Math.max(0, Math.min(100, Math.round(subject.dataConfidence))),
      warnings: scenario?.scenarioQuality.warnings ?? ["trade scenario is unavailable"],
    },
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
    }, {
      critic: llm.criticOutput,
      llmConfidence: llm.analysis.confidence,
    });
    const scores = applyLlmAdjustment(logic.scores, adjustment, logic.scoringInput);
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

export function sanitizeLlmScoreAdjustment(
  subject: AnalysisSubject,
  logic: LogicAnalysisResult,
  adjustment: LlmScoreAdjustment,
  context: { critic?: CriticOutput | null; llmConfidence?: number | null } = {},
): LlmScoreAdjustment {
  const guarded = clampLlmScoreAdjustment(adjustment);
  const guardReasons: string[] = [];
  const hardBlocker = subject.isForbidden || subject.eventBlockerActive || subject.dataConfidence < SIGNAL_THRESHOLDS.dataConfidenceMinimum;
  const highRisk = logic.scores.riskScore >= SIGNAL_THRESHOLDS.riskWatchMaximum;
  const rrFailed = logic.classification.gates.rrGate === false;
  const criticDowngrade = context.critic?.required_downgrade === true;
  const criticBlocksPositive = context.critic?.block_positive_adjustment === true;
  const lowLlmConfidence = typeof context.llmConfidence === "number" && context.llmConfidence < LOW_LLM_CONFIDENCE_THRESHOLD;

  if (
    guarded.opportunity !== adjustment.opportunity ||
    guarded.entryTiming !== adjustment.entryTiming ||
    guarded.risk !== adjustment.risk ||
    guarded.conviction !== adjustment.conviction
  ) {
    guardReasons.push("LLM adjustments were bounded asymmetrically");
  }

  if (lowLlmConfidence) {
    guarded.opportunity = 0;
    guarded.entryTiming = 0;
    guarded.risk = 0;
    guarded.conviction = 0;
    guardReasons.push("low LLM confidence blocks numeric adjustments");
  }

  if (hardBlocker || highRisk || rrFailed || criticDowngrade || criticBlocksPositive) {
    blockOptimisticAdjustments(guarded);
    if (subject.isForbidden) guardReasons.push("forbidden symbol blocks positive LLM adjustments");
    if (subject.eventBlockerActive) guardReasons.push("event blocker blocks positive LLM adjustments");
    if (subject.dataConfidence < SIGNAL_THRESHOLDS.dataConfidenceMinimum) guardReasons.push("low data confidence blocks positive LLM adjustments");
    if (highRisk) guardReasons.push("high risk score blocks positive LLM adjustments");
    if (rrFailed) guardReasons.push("risk/reward gate blocks positive LLM adjustments");
    if (criticDowngrade) guardReasons.push("critic downgrade blocks positive LLM adjustments");
    if (criticBlocksPositive) guardReasons.push("critic blocks positive LLM adjustments");
  }

  if (logic.classification.action === "avoid") {
    blockOptimisticAdjustments(guarded);
    guardReasons.push("avoid classification blocks upgrades from LLM");
  }

  if (guardReasons.length === 0) return guarded;
  return { ...guarded, reason: `${adjustment.reason} | Guarded: ${guardReasons.join("; ")}` };
}

function clampLlmScoreAdjustment(adjustment: LlmScoreAdjustment): LlmScoreAdjustment {
  return {
    ...adjustment,
    opportunity: clampAdjustment(adjustment.opportunity, -MAX_PESSIMISTIC_ADJUSTMENT, MAX_OPTIMISTIC_ADJUSTMENT),
    entryTiming: clampAdjustment(adjustment.entryTiming, -MAX_PESSIMISTIC_ADJUSTMENT, MAX_OPTIMISTIC_ADJUSTMENT),
    risk: clampAdjustment(adjustment.risk, -MAX_OPTIMISTIC_ADJUSTMENT, MAX_PESSIMISTIC_ADJUSTMENT),
    conviction: clampAdjustment(adjustment.conviction, -MAX_PESSIMISTIC_ADJUSTMENT, MAX_OPTIMISTIC_ADJUSTMENT),
  };
}

function clampAdjustment(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function blockOptimisticAdjustments(adjustment: LlmScoreAdjustment): void {
  if (adjustment.opportunity > 0) adjustment.opportunity = 0;
  if (adjustment.entryTiming > 0) adjustment.entryTiming = 0;
  if (adjustment.conviction > 0) adjustment.conviction = 0;
  if (adjustment.risk < 0) adjustment.risk = 0;
}
