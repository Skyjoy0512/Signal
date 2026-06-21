import { describe, it, expect } from "vitest";
import { applyLlmAdjustment, applyTechnicalQualityOverlay, computeAllScores } from "./scoring-engine";
import { SIGNAL_THRESHOLDS } from "./config";
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
});

describe("applyLlmAdjustment", () => {
  it("clamps adjustments to +/-10", () => {
    const input: ScoringInput = { snapshot: sn(), market: null, sector: null, theme: null, symbol: null, dataConfidence: 80 };
    const scores = computeAllScores(input);
    const adj = applyLlmAdjustment(scores, { opportunity: 20, entryTiming: -15, risk: 50, conviction: 0, reason: "test" });
    expect(adj.opportunityScore).toBeLessThanOrEqual(scores.opportunityScore + 10);
    expect(adj.entryTimingScore).toBeGreaterThanOrEqual(scores.entryTimingScore - 10);
    expect(adj.contributions.opportunity.at(-1)?.feature).toBe("llmAdjustment");
    expect(adj.contributions.risk.at(-1)?.polarity).toBe("negative");
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
    expect(r.tierReason).toContain("forbidden");
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
});
