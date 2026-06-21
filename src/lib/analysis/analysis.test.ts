import { describe, expect, it } from "vitest";
import { InvestmentAnalysisEngine, RuleBasedAnalysisEngine, buildLlmInputSnapshot } from "./index";
import { sanitizeLlmScoreAdjustment } from "./llm-enhancer";
import type { AnalysisSubject, LogicAnalysisResult, LlmEnhancer } from "./types";
import type { LayerCondition, SymbolSnapshot } from "../intelligence/types";

function snapshot(overrides: Partial<SymbolSnapshot> = {}): SymbolSnapshot {
  return {
    symbol: "7203.T",
    close: 3100,
    sma20: 3050,
    sma50: 2900,
    sma200: 2700,
    rsi14: 58,
    volumeRatio20d: 1.3,
    return5d: 2.1,
    return20d: 7.5,
    distanceFrom52wHighPct: -2,
    drawdownFromRecentHighPct: -1.5,
    ...overrides,
  };
}

function layer(overrides: Partial<LayerCondition> = {}): LayerCondition {
  return {
    layer_name: "symbol",
    scope_key: "7203.T",
    timeframe: "1D",
    captured_at: "2026-06-21T00:00:00.000Z",
    condition: "bullish",
    trend: "improving",
    strength: 72,
    risk: 35,
    confidence: 80,
    impact: "upgrade",
    reason: "test",
    data_confidence: 85,
    ...overrides,
  };
}

function subject(): AnalysisSubject {
  return {
    symbol: "7203.T",
    name: "トヨタ自動車",
    snapshot: snapshot(),
    market: layer({ layer_name: "market", scope_key: "JP_MARKET" }),
    sector: null,
    theme: null,
    symbolLayer: layer(),
    dataConfidence: 85,
    eventBlockerActive: false,
    isForbidden: false,
  };
}

describe("InvestmentAnalysisEngine", () => {
  it("runs rule-based analysis without requiring an LLM provider", () => {
    const result = new InvestmentAnalysisEngine().analyzeWithRules(subject());
    expect(result.scores.finalEntryScore).toBeGreaterThan(0);
    expect(result.llm).toBeNull();
  });

  it("allows the LLM enhancer to be swapped independently", async () => {
    const enhancer: LlmEnhancer = {
      async enhance(input: AnalysisSubject, logic: LogicAnalysisResult) {
        return {
          scores: { ...logic.scores, finalEntryScore: 99 },
          classification: logic.classification,
          llm: null,
          costUsd: 0.01,
        };
      },
    };
    const result = await new InvestmentAnalysisEngine({ logicEngine: new RuleBasedAnalysisEngine(), llmEnhancer: enhancer }).analyzeWithLlm(subject());
    expect(result.scores.finalEntryScore).toBe(99);
    expect(result.costUsd).toBe(0.01);
  });

  it("builds LLM snapshots from logic output without provider coupling", () => {
    const logic = new RuleBasedAnalysisEngine().analyze(subject());
    const llmInput = buildLlmInputSnapshot(subject(), logic);
    expect(llmInput.symbol).toBe("7203.T");
    expect(llmInput.layers.symbol?.scopeKey).toBe("7203.T");
    expect(llmInput.scoreContributions?.finalEntry.length).toBeGreaterThan(0);
    expect(llmInput.gateDetails?.length).toBeGreaterThan(0);
    expect(llmInput.decisionReasons?.length).toBeGreaterThan(0);
    expect(llmInput.scenario?.calculationMethod).toBeTruthy();
  });

  it("blocks optimistic LLM adjustments when risk controls fail", () => {
    const riskySubject = { ...subject(), dataConfidence: 45, eventBlockerActive: true };
    const logic = new RuleBasedAnalysisEngine().analyze(riskySubject);
    const guarded = sanitizeLlmScoreAdjustment(riskySubject, logic, {
      opportunity: 8,
      entryTiming: 6,
      risk: -7,
      conviction: 5,
      reason: "optimistic read",
    });
    expect(guarded.opportunity).toBeLessThanOrEqual(0);
    expect(guarded.entryTiming).toBeLessThanOrEqual(0);
    expect(guarded.risk).toBeGreaterThanOrEqual(0);
    expect(guarded.reason).toContain("Guarded");
  });
});
