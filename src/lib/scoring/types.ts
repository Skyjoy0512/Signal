import type { LayerCondition, SymbolSnapshot } from "../intelligence/types";

export type StrategyTag = "breakout" | "pullback" | "reversal" | "trend_follow";
export type StrategyFitScores = Record<StrategyTag, number>;

export interface ScoringInput {
  snapshot: SymbolSnapshot;
  market: LayerCondition | null;
  sector: LayerCondition | null;
  theme: LayerCondition | null;
  symbol: LayerCondition | null;
  dataConfidence: number;
  fundamentals?: { roe?: number | null; operatingMargin?: number | null; revenueGrowth?: number | null; epsGrowth?: number | null; pe?: number | null; };
  eventBlockerActive?: boolean;
  isForbidden?: boolean;
}

export interface ScoringOutput {
  opportunityScore: number; entryTimingScore: number; riskScore: number; convictionScore: number;
  finalEntryScore: number; strategyFitScores: StrategyFitScores; strategyTags: StrategyTag[];
  breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  opportunity: { trend: number; volume: number; relativeStrength: number; theme: number; fundamental: number; catalyst: number; };
  entryTiming: { setup: number; rsiPosition: number; atrPosition: number; supportResistance: number; priceAction: number; };
  risk: { volatility: number; liquidity: number; event: number; market: number; sector: number; data: number; };
  conviction: { dataConfidence: number; multiLayerAlignment: number; technicalConfirmation: number; fundamentalConfirmation: number; llmConfidence: number; };
}

export interface SignalClassification {
  action: "strong_entry_candidate" | "entry_candidate" | "watch" | "avoid";
  tier: "S" | "A" | "B" | "C" | "D";
  tierReason: string;
  blockerReason?: string;
  gates: Record<string, boolean>;
  scenario: TradeScenario | null;
}

export interface TradeScenario {
  entryPrice: number; stopPrice: number;
  targetConservative: number; targetBase: number; targetBull: number;
  upsideConservativePct: number; upsideBasePct: number; upsideBullPct: number;
  downsidePct: number; riskRewardBase: number;
  expectedHoldingPeriod: string; calculationMethod: string;
}

export interface LlmScoreAdjustment {
  opportunity: number; entryTiming: number; risk: number; conviction: number; reason: string;
}
