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
  contributions: ScoreContributions;
  featureAvailability: Record<string, boolean>;
}

export interface ScoreBreakdown {
  opportunity: { trend: number; volume: number; relativeStrength: number; theme: number; fundamental: number; catalyst: number; };
  entryTiming: { setup: number; rsiPosition: number; atrPosition: number; supportResistance: number; priceAction: number; };
  risk: { volatility: number; liquidity: number; event: number; market: number; sector: number; data: number; overheating: number; trendBreakdown: number; valuation: number; breakoutFailure: number; };
  conviction: { dataConfidence: number; multiLayerAlignment: number; technicalConfirmation: number; fundamentalConfirmation: number; llmConfidence: number; };
}

export type ScoreComponent = "opportunity" | "entryTiming" | "risk" | "conviction" | "finalEntry";
export type ContributionPolarity = "positive" | "negative" | "neutral";

export interface ScoreContribution {
  component: ScoreComponent;
  feature: string;
  label: string;
  rawScore: number;
  weight: number;
  contribution: number;
  signedImpact: number;
  impactMagnitude: number;
  polarity: ContributionPolarity;
  reason: string;
  available?: boolean;
  missingReason?: string;
}

export type ScoreContributions = Record<ScoreComponent, ScoreContribution[]>;

export interface SignalClassification {
  action: "strong_entry_candidate" | "entry_candidate" | "watch" | "avoid";
  tier: "S" | "A" | "B" | "C" | "D";
  tierReason: string;
  blockerReason?: string;
  gates: Record<string, boolean>;
  gateDetails: SignalGateDetail[];
  reasons: SignalDecisionReason[];
  scenario: TradeScenario | null;
}

export interface SignalGateDetail {
  key: string;
  label: string;
  passed: boolean;
  actual: number | boolean | null;
  threshold: number | boolean;
  severity: "blocker" | "warning" | "info";
  reason: string;
}

export interface SignalDecisionReason {
  code: string;
  message: string;
  severity: "blocker" | "warning" | "info";
}

export interface TradeScenario {
  entryPrice: number; stopPrice: number;
  targetConservative: number; targetBase: number; targetBull: number;
  upsideConservativePct: number; upsideBasePct: number; upsideBullPct: number;
  downsidePct: number; riskRewardBase: number;
  expectedHoldingPeriod: string; calculationMethod: string;
  scenarioQuality: ScenarioQuality;
}

export interface ScenarioQuality {
  atrSource: "actual" | "estimated" | "unavailable";
  swingHighSource: "actual" | "missing";
  swingLowSource: "actual" | "missing";
  confidence: number;
  warnings: string[];
}

export interface LlmScoreAdjustment {
  opportunity: number; entryTiming: number; risk: number; conviction: number; reason: string;
}
