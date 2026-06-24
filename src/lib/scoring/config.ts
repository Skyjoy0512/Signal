export const SCORE_WEIGHTS = {
  opportunity: {
    trend: 0.25,
    volume: 0.20,
    relativeStrength: 0.15,
    theme: 0.15,
    fundamental: 0.15,
    catalyst: 0.10,
  },
  entryTiming: {
    setup: 0.30,
    rsiPosition: 0.15,
    atrPosition: 0.15,
    supportResistance: 0.20,
    priceAction: 0.20,
  },
  risk: {
    volatility: 0.16,
    liquidity: 0.13,
    event: 0.13,
    market: 0.11,
    sector: 0.08,
    data: 0.08,
    overheating: 0.09,
    trendBreakdown: 0.10,
    valuation: 0.04,
    breakoutFailure: 0.08,
  },
  conviction: {
    dataConfidence: 0.25,
    multiLayerAlignment: 0.25,
    technicalConfirmation: 0.20,
    fundamentalConfirmation: 0.15,
    llmConfidence: 0.15,
  },
  finalEntry: {
    opportunityScore: 0.35,
    entryTimingScore: 0.25,
    riskControl: 0.20,
    convictionScore: 0.20,
  },
} as const;

export const SCORE_ENGINE_VERSION = "score-engine-v1";
export const SCORING_CONFIG_VERSION = "scoring-config-v1";

export const SIGNAL_THRESHOLDS = {
  dataConfidenceMinimum: 60,
  dataConfidenceEntry: 70,
  dataConfidenceStrong: 80,
  riskEntryMaximum: 60,
  riskStrongMaximum: 45,
  riskWatchMaximum: 75,
  finalWatchMinimum: 60,
  finalEntryMinimum: 70,
  finalStrongMinimum: 80,
  finalTierSMinimum: 88,
  finalTierAMinimum: 78,
  finalTierBMinimum: 68,
  entryTimingMinimum: 60,
  entryTimingStrongMinimum: 70,
  convictionMinimum: 60,
  convictionStrongMinimum: 70,
  riskRewardMinimum: 1.2,
} as const;

export const FINAL_SCORE_CAPS = {
  forbidden: 30,
  lowDataConfidence: 45,
  eventBlocker: 55,
  extremeRisk: 50,
  highRisk: 60,
  bearishMarket: 65,
} as const;
