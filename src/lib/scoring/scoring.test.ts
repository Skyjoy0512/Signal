import { describe, it, expect } from "vitest";
import { applyLlmAdjustment, applyTechnicalQualityOverlay, computeAllScores } from "./scoring-engine";
import { FINAL_SCORE_CAPS, SIGNAL_THRESHOLDS } from "./config";
import { computeTradeScenario } from "./target-stop";
import { detectSignal } from "./signal-detector";
import type { ScoringInput } from "./types";
import type { SymbolSnapshot, LayerCondition } from "../intelligence/types";

function sn(overrides: Partial<SymbolSnapshot> = {}): SymbolSnapshot {
  return { symbol: "7203.T", close: 3100, sma20: 3050, sma50: 2900, sma200: 2700, rsi14: 58, volumeRatio20d: 1.2, return5d: 3.5, return20d: 8.2, distanceFrom52wHighPct: -2, drawdownFromRecentHighPct: -1.5, ...overrides };
}

function lc(overrides: Partial<LayerCondition> & { layer_name: string; scope_key: string }): LayerCondition {
  return { timeframe: "1D", captured_at: "2024-06-27T06:00:00Z", condition: "bullish", trend: "improving", strength: 70, risk: 40, confidence: 75, impact: "upgrade", reason: "test", data_confidence: 80, ...overrides };
}

function neutralLayer(overrides: Partial<LayerCondition> & { layer_name: string; scope_key: string }): LayerCondition {
  return lc({ condition: "neutral", trend: "stable", strength: 50, risk: 50, confidence: 70, impact: "neutral", ...overrides });
}

function neutralInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    snapshot: sn({
      close: 3000,
      sma20: 3000,
      sma50: 3000,
      sma200: 3000,
      rsi14: 50,
      volumeRatio20d: 1,
      return5d: 0,
      return20d: 0,
      distanceFrom52wHighPct: -10,
      drawdownFromRecentHighPct: -5,
    }),
    market: neutralLayer({ layer_name: "market", scope_key: "JP_MARKET" }),
    sector: neutralLayer({ layer_name: "sector", scope_key: "AUTO" }),
    theme: null,
    symbol: neutralLayer({ layer_name: "symbol", scope_key: "7203.T" }),
    dataConfidence: 85,
    ...overrides,
  };
}

describe("computeAllScores", () => {
  it("produces all score components", () => {
    const input: ScoringInput = { snapshot: sn(), market: lc({ layer_name: "market", scope_key: "JP_MARKET", condition: "bullish" }), sector: lc({ layer_name: "sector", scope_key: "SEMI", condition: "bullish" }), theme: null, symbol: lc({ layer_name: "symbol", scope_key: "7203.T", condition: "bullish" }), dataConfidence: 85 };
    const r = computeAllScores(input);
    expect(r.opportunityScore).toBeGreaterThanOrEqual(40);
    expect(r.riskScore).toBeLessThanOrEqual(100);
    expect(r.strategyTags.length).toBeGreaterThanOrEqual(1);
    expect(r.contributions.opportunity.length).toBeGreaterThan(0);
    expect(r.contributions.finalEntry.map((c) => c.feature)).toContain("riskControl");
    expect(r.contributions.finalEntry.find((c) => c.feature === "riskControl")?.weight).toBe(0.2);
    expect(r.contributions.finalEntry.find((c) => c.feature === "riskControl")?.impactMagnitude).toBeGreaterThanOrEqual(0);
  });
  it("lower scores for bearish setup", () => {
    const input: ScoringInput = { snapshot: sn({ close: 2500, sma20: 2700, sma50: 2800, rsi14: 28, volumeRatio20d: 0.4, return5d: -5, return20d: -10, distanceFrom52wHighPct: -25, drawdownFromRecentHighPct: -18 }), market: lc({ layer_name: "market", scope_key: "JP_MARKET", condition: "bearish" }), sector: lc({ layer_name: "sector", scope_key: "SEMI", condition: "bearish" }), theme: null, symbol: lc({ layer_name: "symbol", scope_key: "7203.T", condition: "bearish" }), dataConfidence: 60 };
    const r = computeAllScores(input);
    expect(r.riskScore).toBeGreaterThanOrEqual(50);
  });
  it("raises explainable risk for overheating and trend damage", () => {
    const input: ScoringInput = { snapshot: sn({ close: 2500, sma20: 2700, sma50: 2800, rsi14: 82, return5d: 11, return20d: 20, volumeRatio20d: 0.25 }), market: null, sector: null, theme: null, symbol: null, dataConfidence: 85, fundamentals: { pe: 90 } };
    const r = computeAllScores(input);
    expect(r.breakdown.risk.overheating).toBeGreaterThanOrEqual(80);
    expect(r.breakdown.risk.trendBreakdown).toBeGreaterThanOrEqual(70);
    expect(r.breakdown.risk.valuation).toBeGreaterThanOrEqual(80);
    expect(r.contributions.risk.find((c) => c.feature === "overheating")?.polarity).toBe("negative");
    expect(r.contributions.risk.find((c) => c.feature === "overheating")?.signedImpact).toBeLessThan(0);
  });
  it("discounts the opportunity score when valuation is excessive despite good quality", () => {
    const baseInput: ScoringInput = {
      snapshot: sn(),
      market: null,
      sector: null,
      theme: null,
      symbol: null,
      dataConfidence: 85,
      fundamentals: { roe: 22, operatingMargin: 21, revenueGrowth: 16, epsGrowth: 22, pe: 22 },
    };
    const disciplined = computeAllScores(baseInput);
    const stretched = computeAllScores({ ...baseInput, fundamentals: { ...baseInput.fundamentals, pe: 120 } });
    expect(stretched.breakdown.opportunity.fundamental).toBeLessThan(disciplined.breakdown.opportunity.fundamental);
    expect(stretched.contributions.opportunity.find((c) => c.feature === "fundamental")?.reason).toContain("P/E");
  });
  it("caps final score when risk is a rejection reason", () => {
    const input: ScoringInput = { snapshot: sn({ close: 3100, sma20: 3000, sma50: 2900, rsi14: 84, return5d: 12, return20d: 24, volumeRatio20d: 2.2, distanceFrom52wHighPct: -1 }), market: lc({ layer_name: "market", scope_key: "JP_MARKET", condition: "bullish" }), sector: lc({ layer_name: "sector", scope_key: "SEMI", condition: "bullish" }), theme: null, symbol: lc({ layer_name: "symbol", scope_key: "7203.T", condition: "bullish" }), dataConfidence: 90, fundamentals: { pe: 120, roe: 20, operatingMargin: 18, revenueGrowth: 12 } };
    const r = computeAllScores(input);
    expect(r.breakdown.risk.breakoutFailure).toBeGreaterThanOrEqual(60);
    if (r.riskScore >= 75) expect(r.finalEntryScore).toBeLessThanOrEqual(60);
    expect(r.contributions.finalEntry.find((c) => c.feature === "riskCap")).toBeTruthy();
  });
  it("keeps neutral components near neutral final score", () => {
    const r = computeAllScores(neutralInput());
    expect(r.finalEntryScore).toBeGreaterThanOrEqual(45);
    expect(r.finalEntryScore).toBeLessThanOrEqual(55);
  });
  it("excludes unavailable features from weighted scoring and exposes availability", () => {
    const r = computeAllScores(neutralInput({
      snapshot: sn({
        sma20: null,
        sma50: null,
        rsi14: null,
        volumeRatio20d: null,
        return5d: null,
        return20d: null,
        distanceFrom52wHighPct: null,
        drawdownFromRecentHighPct: null,
      }),
      market: null,
      sector: null,
      theme: null,
      symbol: null,
      fundamentals: undefined,
    }));
    const volume = r.contributions.opportunity.find((c) => c.feature === "volume");
    const catalyst = r.contributions.opportunity.find((c) => c.feature === "catalyst");
    const dataRisk = r.contributions.risk.find((c) => c.feature === "data");
    expect(volume?.available).toBe(false);
    expect(volume?.weight).toBe(0);
    expect(catalyst?.missingReason).toContain("not yet integrated");
    expect(dataRisk?.available).toBe(true);
    expect(r.featureAvailability["opportunity.volume"]).toBe(false);
    expect(r.featureAvailability["risk.data"]).toBe(true);
  });
  it("does not lift weak symbols above the entry threshold", () => {
    const input = neutralInput({
      snapshot: sn({
        close: 2400,
        sma20: 2700,
        sma50: 2850,
        sma200: 3000,
        rsi14: 34,
        volumeRatio20d: 0.45,
        return5d: -4,
        return20d: -12,
        distanceFrom52wHighPct: -28,
        drawdownFromRecentHighPct: -22,
      }),
      dataConfidence: 70,
    });
    const r = computeAllScores(input);
    expect(r.finalEntryScore).toBeLessThan(SIGNAL_THRESHOLDS.finalEntryMinimum);
  });
  it("lets bullish market and sector help without dominating neutral input", () => {
    const neutral = computeAllScores(neutralInput());
    const bullish = computeAllScores(neutralInput({
      market: lc({ layer_name: "market", scope_key: "JP_MARKET", condition: "bullish" }),
      sector: lc({ layer_name: "sector", scope_key: "AUTO", condition: "bullish" }),
    }));
    expect(bullish.finalEntryScore).toBeGreaterThan(neutral.finalEntryScore);
    expect(bullish.finalEntryScore).toBeLessThan(SIGNAL_THRESHOLDS.finalEntryMinimum);
  });
  it("applies bearish market cap", () => {
    const r = computeAllScores(neutralInput({
      snapshot: sn({ rsi14: 62, volumeRatio20d: 1.8, return5d: 2, return20d: 8, distanceFrom52wHighPct: -1 }),
      market: lc({ layer_name: "market", scope_key: "JP_MARKET", condition: "bearish" }),
      sector: lc({ layer_name: "sector", scope_key: "AUTO", condition: "bullish" }),
    }));
    expect(r.finalEntryScore).toBeLessThanOrEqual(FINAL_SCORE_CAPS.bearishMarket);
  });
});

describe("applyLlmAdjustment", () => {
  it("clamps adjustments to +/-10", () => {
    const input: ScoringInput = { snapshot: sn(), market: null, sector: null, theme: null, symbol: null, dataConfidence: 80 };
    const scores = computeAllScores(input);
    const adj = applyLlmAdjustment(scores, { opportunity: 20, entryTiming: -15, risk: 50, conviction: 0, reason: "test" }, input);
    expect(adj.opportunityScore).toBeLessThanOrEqual(scores.opportunityScore + 10);
    expect(adj.entryTimingScore).toBeGreaterThanOrEqual(scores.entryTimingScore - 10);
    expect(adj.contributions.opportunity.at(-1)?.feature).toBe("llmAdjustment");
    expect(adj.contributions.risk.at(-1)?.polarity).toBe("negative");
  });
  it("cannot bypass low data, event, bearish, or forbidden caps", () => {
    const cases: Array<[string, ScoringInput, number]> = [
      ["low data", neutralInput({ dataConfidence: 45 }), FINAL_SCORE_CAPS.lowDataConfidence],
      ["event blocker", neutralInput({ eventBlockerActive: true }), FINAL_SCORE_CAPS.eventBlocker],
      ["bearish market", neutralInput({ market: lc({ layer_name: "market", scope_key: "JP_MARKET", condition: "bearish" }) }), FINAL_SCORE_CAPS.bearishMarket],
      ["forbidden", neutralInput({ isForbidden: true }), FINAL_SCORE_CAPS.forbidden],
    ];
    for (const [label, input, cap] of cases) {
      const adjusted = applyLlmAdjustment(computeAllScores(input), { opportunity: 10, entryTiming: 10, risk: -10, conviction: 10, reason: label }, input);
      expect(adjusted.finalEntryScore, label).toBeLessThanOrEqual(cap);
    }
  });
});

describe("applyTechnicalQualityOverlay", () => {
  it("adds an explainable technical overlay without bypassing risk caps", () => {
    const input: ScoringInput = {
      snapshot: sn({ close: 3100, sma20: 3000, sma50: 2900, rsi14: 84, return5d: 12, return20d: 24, volumeRatio20d: 2.2, distanceFrom52wHighPct: -1 }),
      market: lc({ layer_name: "market", scope_key: "JP_MARKET", condition: "bullish" }),
      sector: null,
      theme: null,
      symbol: lc({ layer_name: "symbol", scope_key: "7203.T", condition: "bullish" }),
      dataConfidence: 90,
      fundamentals: { pe: 120, roe: 20, operatingMargin: 18, revenueGrowth: 12 },
    };
    const scores = computeAllScores(input);
    const adjusted = applyTechnicalQualityOverlay(scores, input, 95, ["RSI/MACD/EMA quality is high"]);
    expect(adjusted.contributions.conviction.at(-1)?.feature).toBe("technicalQualityOverlay");
    expect(adjusted.contributions.finalEntry.map((c) => c.feature)).toContain("technicalQualityOverlay");
    if (adjusted.riskScore >= 75) expect(adjusted.finalEntryScore).toBeLessThanOrEqual(60);
  });
});

describe("computeTradeScenario", () => {
  it("computes ATR-based targets", () => {
    const s = computeTradeScenario({ snapshot: sn({ close: 3100 }), atr20: 75 });
    expect(s.entryPrice).toBe(3100);
    expect(s.stopPrice).toBeLessThan(3100);
    expect(s.targetBase).toBeGreaterThan(3100);
    expect(s.riskRewardBase).toBeGreaterThan(0);
    expect(s.scenarioQuality.atrSource).toBe("actual");
    expect(s.scenarioQuality.confidence).toBeGreaterThan(50);
  });
  it("marks scenario quality as estimated when ATR and swing points are missing", () => {
    const s = computeTradeScenario({ snapshot: sn({ close: 3100 }) });
    expect(s.calculationMethod).toContain("atr_estimated");
    expect(s.scenarioQuality.atrSource).toBe("estimated");
    expect(s.scenarioQuality.swingHighSource).toBe("missing");
    expect(s.scenarioQuality.swingLowSource).toBe("missing");
    expect(s.scenarioQuality.warnings.length).toBeGreaterThan(0);
  });
  it("adapts stop and target assumptions by strategy tag", () => {
    const baseSnapshot = sn({ close: 3100, sma20: null });
    const breakout = computeTradeScenario({ snapshot: baseSnapshot, atr20: 75, strategyTags: ["breakout"] });
    const reversal = computeTradeScenario({ snapshot: baseSnapshot, atr20: 75, strategyTags: ["reversal"] });
    expect(breakout.calculationMethod).toContain("breakout");
    expect(reversal.calculationMethod).toContain("reversal");
    expect(breakout.stopPrice).toBeGreaterThan(reversal.stopPrice);
    expect(breakout.targetBull).toBeGreaterThan(breakout.targetBase);
  });
});

describe("detectSignal", () => {
  function mkScores() {
    const input: ScoringInput = { snapshot: sn(), market: lc({ layer_name: "market", scope_key: "JP_MARKET", condition: "bullish" }), sector: null, theme: null, symbol: lc({ layer_name: "symbol", scope_key: "7203.T", condition: "bullish" }), dataConfidence: 85 };
    return computeAllScores(input);
  }

  it("detects avoid for forbidden", () => {
    const r = detectSignal({ scores: mkScores(), market: null, symbol: null, dataConfidence: 90, eventBlockerActive: false, isForbidden: true, entryPrice: 3100 });
    expect(r.action).toBe("avoid");
    expect(r.tierReason).toContain("対象外銘柄");
    expect(r.reasons[0].code).toBe("forbidden_symbol");
    expect(r.gateDetails.find((gate) => gate.key === "forbiddenGate")?.passed).toBe(false);
  });

  it("detects avoid for low data confidence", () => {
    const r = detectSignal({ scores: mkScores(), market: null, symbol: null, dataConfidence: 40, eventBlockerActive: false, isForbidden: false, entryPrice: 3100 });
    expect(r.action).toBe("avoid");
    expect(r.gateDetails.find((gate) => gate.key === "dataConfidenceGate")?.threshold).toBe(SIGNAL_THRESHOLDS.dataConfidenceMinimum);
  });

  it("classifies entry_candidate or watch for good scores", () => {
    const scores = mkScores();
    const r = detectSignal({ scores: { ...scores, finalEntryScore: 75, entryTimingScore: 65, convictionScore: 68, riskScore: 45 }, market: null, symbol: null, dataConfidence: 80, eventBlockerActive: false, isForbidden: false, entryPrice: 3100, atr20: 60 });
    expect(["entry_candidate", "watch"]).toContain(r.action);
    expect(r.gateDetails.length).toBeGreaterThan(0);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("sorts weak reasons by negative impact magnitude", () => {
    const scores = mkScores();
    const r = detectSignal({
      scores: {
        ...scores,
        finalEntryScore: 45,
        riskScore: 80,
        contributions: {
          ...scores.contributions,
          risk: [
            { component: "risk", feature: "small", label: "Small risk", rawScore: 65, weight: 0.1, contribution: 6.5, signedImpact: -6.5, impactMagnitude: 6.5, polarity: "negative", reason: "small" },
            { component: "risk", feature: "large", label: "Large risk", rawScore: 90, weight: 0.2, contribution: 18, signedImpact: -18, impactMagnitude: 18, polarity: "negative", reason: "large" },
            { component: "risk", feature: "good", label: "Good risk control", rawScore: 35, weight: 0.2, contribution: 7, signedImpact: 7, impactMagnitude: 7, polarity: "positive", reason: "positive risk control" },
          ],
          entryTiming: [],
          opportunity: [],
        },
      },
      market: null,
      symbol: null,
      dataConfidence: 80,
      eventBlockerActive: false,
      isForbidden: false,
      entryPrice: 3100,
      atr20: 60,
    });
    const weakReasons = r.reasons.filter((reason) => reason.code.startsWith("weak_"));
    expect(weakReasons[0]?.code).toBe("weak_risk_large");
    expect(weakReasons.map((reason) => reason.code)).not.toContain("weak_risk_good");
  });
});
