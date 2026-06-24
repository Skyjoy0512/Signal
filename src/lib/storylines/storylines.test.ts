import { describe, expect, it } from "vitest";
import { generateStorylineSet } from "./engine";
import { storylineSetFromRows } from "./persistence";
import type { ScoredSymbol } from "../jobs/types";

function scored(overrides: Partial<ScoredSymbol> = {}): ScoredSymbol {
  const base: ScoredSymbol = {
    symbol: {
      id: "sym-1",
      symbol: "7203.T",
      name: "Toyota",
      asset_type: "jp_stock",
      exchange: "TSE",
      currency: "JPY",
      sector: "Transportation Equipment",
      industry: "Auto",
      country: "JP",
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    snapshot: {
      symbol: "7203.T",
      close: 3100,
      sma20: 3050,
      sma50: 2950,
      sma200: 2800,
      rsi14: 58,
      volumeRatio20d: 1.4,
      return5d: 2.2,
      return20d: 8,
      distanceFrom52wHighPct: -2,
      drawdownFromRecentHighPct: -1,
    },
    layer: {
      layer_name: "symbol",
      scope_key: "7203.T",
      timeframe: "1D",
      captured_at: "2026-06-21T00:00:00.000Z",
      condition: "bullish",
      trend: "improving",
      strength: 72,
      risk: 38,
      confidence: 78,
      impact: "upgrade",
      reason: "test",
      data_confidence: 85,
    },
    scores: {
      opportunityScore: 76,
      entryTimingScore: 68,
      riskScore: 42,
      convictionScore: 72,
      finalEntryScore: 78,
      strategyFitScores: { breakout: 68, pullback: 56, reversal: 42, trend_follow: 70 },
      strategyTags: ["breakout", "trend_follow"],
      breakdown: {
        opportunity: { trend: 80, volume: 70, relativeStrength: 75, theme: 60, fundamental: 65, catalyst: 50 },
        entryTiming: { setup: 75, rsiPosition: 70, atrPosition: 55, supportResistance: 65, priceAction: 65 },
        risk: { volatility: 40, liquidity: 35, event: 50, market: 40, sector: 40, data: 30, overheating: 45, trendBreakdown: 30, valuation: 50, breakoutFailure: 40 },
        conviction: { dataConfidence: 85, multiLayerAlignment: 70, technicalConfirmation: 75, fundamentalConfirmation: 60, llmConfidence: 50 },
      },
      contributions: {
        opportunity: [],
        entryTiming: [{ component: "entryTiming", feature: "setup", label: "Setup", rawScore: 75, weight: 0.3, contribution: 22.5, signedImpact: 22.5, impactMagnitude: 22.5, polarity: "positive", reason: "setup ok" }],
        risk: [{ component: "risk", feature: "volatility", label: "Volatility", rawScore: 40, weight: 0.16, contribution: 6.4, signedImpact: 6.4, impactMagnitude: 6.4, polarity: "positive", reason: "low volatility" }],
        conviction: [],
        finalEntry: [],
      },
      featureAvailability: {
        "entryTiming.setup": true,
        "risk.volatility": true,
      },
    },
    classification: {
      action: "entry_candidate",
      tier: "A",
      tierReason: "entry gates passed",
      gates: {},
      gateDetails: [],
      reasons: [{ code: "entry_gates_passed", message: "entry gates passed", severity: "info" }],
      scenario: {
        entryPrice: 3100,
        stopPrice: 3002,
        targetConservative: 3190,
        targetBase: 3280,
        targetBull: 3400,
        upsideConservativePct: 2.9,
        upsideBasePct: 5.8,
        upsideBullPct: 9.7,
        downsidePct: -3.2,
        riskRewardBase: 1.84,
        expectedHoldingPeriod: "2W-2M",
        calculationMethod: "atr_breakout_v2",
        scenarioQuality: {
          atrSource: "actual",
          swingHighSource: "actual",
          swingLowSource: "actual",
          confidence: 95,
          warnings: [],
        },
      },
    },
  };
  return { ...base, ...overrides };
}

describe("generateStorylineSet", () => {
  it("generates best/base/conservative/worst storylines", () => {
    const result = generateStorylineSet({ scored: scored(), dataConfidence: 85, generatedAt: "2026-06-21T00:00:00.000Z" });
    expect(result.status).toBe("new");
    expect(result.activeScenario).toBe("base");
    expect(result.probabilityMethod).toBe("rule-normalized-v1");
    expect(result.scenarios.map((scenario) => scenario.kind)).toEqual(["best", "base", "conservative", "worst"]);
    expect(result.scenarios.reduce((sum, scenario) => sum + scenario.probabilityPct, 0)).toBe(100);
    expect(result.scenarios.every((scenario) => scenario.rawWeight && scenario.rawWeight > 0)).toBe(true);
    expect(result.scenarios.find((scenario) => scenario.kind === "best")?.targetPrice).toBeGreaterThan(3280);
  });

  it("reduces optimistic probability and raises defensive scenarios when data confidence is low", () => {
    const highConfidence = generateStorylineSet({ scored: scored(), dataConfidence: 85, generatedAt: "2026-06-21T00:00:00.000Z" });
    const lowConfidence = generateStorylineSet({ scored: scored(), dataConfidence: 45, generatedAt: "2026-06-21T00:00:00.000Z" });
    expect(lowConfidence.scenarios.reduce((sum, scenario) => sum + scenario.probabilityPct, 0)).toBe(100);
    expect(lowConfidence.scenarios.find((scenario) => scenario.kind === "best")?.probabilityPct).toBeLessThan(highConfidence.scenarios.find((scenario) => scenario.kind === "best")?.probabilityPct ?? 0);
    const highDefensive = (highConfidence.scenarios.find((scenario) => scenario.kind === "conservative")?.probabilityPct ?? 0) + (highConfidence.scenarios.find((scenario) => scenario.kind === "worst")?.probabilityPct ?? 0);
    const lowDefensive = (lowConfidence.scenarios.find((scenario) => scenario.kind === "conservative")?.probabilityPct ?? 0) + (lowConfidence.scenarios.find((scenario) => scenario.kind === "worst")?.probabilityPct ?? 0);
    expect(lowDefensive).toBeGreaterThan(highDefensive);
  });

  it("raises conservative and worst probabilities when an event blocker is active", () => {
    const normal = generateStorylineSet({ scored: scored(), dataConfidence: 85, generatedAt: "2026-06-21T00:00:00.000Z" });
    const blocked = generateStorylineSet({
      scored: scored({
        classification: {
          ...scored().classification,
          gates: { eventBlockerGate: false },
          gateDetails: [{ key: "eventBlockerGate", label: "Event blocker", passed: false, actual: true, threshold: false, severity: "blocker", reason: "event blocker is active" }],
        },
      }),
      dataConfidence: 85,
      generatedAt: "2026-06-21T00:00:00.000Z",
    });
    const normalDefensive = (normal.scenarios.find((scenario) => scenario.kind === "conservative")?.probabilityPct ?? 0) + (normal.scenarios.find((scenario) => scenario.kind === "worst")?.probabilityPct ?? 0);
    const blockedDefensive = (blocked.scenarios.find((scenario) => scenario.kind === "conservative")?.probabilityPct ?? 0) + (blocked.scenarios.find((scenario) => scenario.kind === "worst")?.probabilityPct ?? 0);
    expect(blocked.scenarios.reduce((sum, scenario) => sum + scenario.probabilityPct, 0)).toBe(100);
    expect(blockedDefensive).toBeGreaterThan(normalDefensive);
  });

  it("marks the storyline revised when the active scenario changes", () => {
    const current = scored({
      scores: { ...scored().scores, finalEntryScore: 58, entryTimingScore: 48, riskScore: 68 },
      classification: { ...scored().classification, action: "watch", tier: "C" },
    });
    const result = generateStorylineSet({
      scored: current,
      dataConfidence: 85,
      generatedAt: "2026-06-22T00:00:00.000Z",
      previous: { symbol: "7203.T", activeScenario: "base", finalEntryScore: 78, riskScore: 42, entryTimingScore: 68 },
    });
    expect(result.status).toBe("revised");
    expect(result.activeScenario).toBe("conservative");
    expect(result.revisionReasons.length).toBeGreaterThan(0);
  });

  it("invalidates a previous positive storyline when current action is avoid", () => {
    const current = scored({
      scores: { ...scored().scores, finalEntryScore: 40, entryTimingScore: 35, riskScore: 82 },
      classification: { ...scored().classification, action: "avoid", tier: "D", blockerReason: "high risk" },
    });
    const result = generateStorylineSet({
      scored: current,
      dataConfidence: 85,
      generatedAt: "2026-06-22T00:00:00.000Z",
      previous: { symbol: "7203.T", activeScenario: "base", finalEntryScore: 78, riskScore: 42, entryTimingScore: 68 },
    });
    expect(result.status).toBe("invalidated");
    expect(result.activeScenario).toBe("worst");
  });
});

describe("storylineSetFromRows", () => {
  it("converts persisted rows back into the app storyline shape", () => {
    const set = storylineSetFromRows(
      {
        id: "set-1",
        analysis_run_id: null,
        symbol_id: "sym-1",
        symbol: "7203.T",
        generated_at: "2026-06-22T00:00:00.000Z",
        status: "revised",
        active_scenario: "conservative",
        revision_summary: "updated",
        revision_reasons_json: ["risk score moved 40 -> 55"],
        score_snapshot_json: {
          action: "watch",
          tier: "C",
          finalEntryScore: 62,
          opportunityScore: 70,
          entryTimingScore: 58,
          riskScore: 55,
          convictionScore: 64,
          dataConfidence: 82,
          strategyTags: ["pullback"],
        },
        created_at: "2026-06-22T00:00:00.000Z",
      },
      [{
        id: "scenario-1",
        storyline_set_id: "set-1",
        scenario_kind: "worst",
        label: "Worst Story",
        probability_pct: 24,
        horizon: "1-3M",
        thesis: "risk case",
        expected_return_pct: -8,
        target_price: 2850,
        stop_price: 2900,
        key_drivers_json: ["Risk 55"],
        confirmation_signals_json: ["risk up"],
        invalidation_signals_json: ["breakout"],
        risk_notes_json: ["volatility"],
        created_at: "2026-06-22T00:00:00.000Z",
      }],
    );

    expect(set.status).toBe("revised");
    expect(set.activeScenario).toBe("conservative");
    expect(set.probabilityMethod).toBe("legacy");
    expect(set.scoreSnapshot.strategyTags).toEqual(["pullback"]);
    expect(set.scenarios[0].kind).toBe("worst");
    expect(set.scenarios[0].normalizedProbabilityPct).toBe(24);
    expect(set.scenarios[0].riskNotes).toEqual(["volatility"]);
  });
});
