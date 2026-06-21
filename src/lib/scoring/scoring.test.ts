import { describe, it, expect } from "vitest";
import { computeAllScores, applyLlmAdjustment } from "./scoring-engine";
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
  });
  it("lower scores for bearish setup", () => {
    const input: ScoringInput = { snapshot: sn({ close: 2500, sma20: 2700, sma50: 2800, rsi14: 28, volumeRatio20d: 0.4, return5d: -5, return20d: -10, distanceFrom52wHighPct: -25, drawdownFromRecentHighPct: -18 }), market: lc({ layer_name: "market", scope_key: "JP_MARKET", condition: "bearish" }), sector: lc({ layer_name: "sector", scope_key: "SEMI", condition: "bearish" }), theme: null, symbol: lc({ layer_name: "symbol", scope_key: "7203.T", condition: "bearish" }), dataConfidence: 60 };
    const r = computeAllScores(input);
    expect(r.riskScore).toBeGreaterThanOrEqual(50);
  });
});

describe("applyLlmAdjustment", () => {
  it("clamps adjustments to +/-10", () => {
    const input: ScoringInput = { snapshot: sn(), market: null, sector: null, theme: null, symbol: null, dataConfidence: 80 };
    const scores = computeAllScores(input);
    const adj = applyLlmAdjustment(scores, { opportunity: 20, entryTiming: -15, risk: 50, conviction: 0, reason: "test" });
    expect(adj.opportunityScore).toBeLessThanOrEqual(scores.opportunityScore + 10);
    expect(adj.entryTimingScore).toBeGreaterThanOrEqual(scores.entryTimingScore - 10);
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
  });

  it("detects avoid for low data confidence", () => {
    const r = detectSignal({ scores: mkScores(), market: null, symbol: null, dataConfidence: 40, eventBlockerActive: false, isForbidden: false, entryPrice: 3100 });
    expect(r.action).toBe("avoid");
  });

  it("classifies entry_candidate or watch for good scores", () => {
    const scores = mkScores();
    const r = detectSignal({ scores: { ...scores, finalEntryScore: 75, entryTimingScore: 65, convictionScore: 68, riskScore: 45 }, market: null, symbol: null, dataConfidence: 80, eventBlockerActive: false, isForbidden: false, entryPrice: 3100, atr20: 60 });
    expect(["entry_candidate", "watch"]).toContain(r.action);
  });
});
