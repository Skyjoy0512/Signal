import { describe, it, expect } from "vitest";
import { evaluateMarketRegime } from "./market-regime";
import { evaluateSector } from "./sector";
import { evaluateSymbol } from "./symbol";
import { computeAllLayers } from "./orchestrator";
import type { SymbolSnapshot } from "./types";

function sn(overrides: Partial<SymbolSnapshot> = {}): SymbolSnapshot {
  return { symbol: "7203.T", close: 3100, sma20: 3050, sma50: 2900, sma200: 2700, rsi14: 58, volumeRatio20d: 1.2, return5d: 3.5, return20d: 8.2, distanceFrom52wHighPct: -2, drawdownFromRecentHighPct: -1.5, ...overrides };
}

const NOW = "2024-06-27T06:00:00Z";

describe("evaluateMarketRegime", () => {
  it("returns neutral for empty benchmark", () => {
    const r = evaluateMarketRegime({ benchmark: [], timeframe: "1D", capturedAt: NOW });
    expect(r.condition).toBe("neutral");
    expect(r.data_confidence).toBe(0);
  });
  it("detects strong_bullish", () => {
    const r = evaluateMarketRegime({ benchmark: [sn({ close: 3200, sma20: 3000, sma50: 2800, rsi14: 65, return5d: 5, return20d: 12, distanceFrom52wHighPct: -1 })], timeframe: "1D", capturedAt: NOW });
    expect(["strong_bullish", "bullish"]).toContain(r.condition);
    expect(r.impact).toBe("upgrade");
  });
  it("detects bearish", () => {
    const r = evaluateMarketRegime({ benchmark: [sn({ close: 2500, sma20: 2700, sma50: 2800, rsi14: 32, return5d: -5, return20d: -10, distanceFrom52wHighPct: -20 })], timeframe: "1W", capturedAt: NOW });
    expect(["strong_bearish", "bearish"]).toContain(r.condition);
  });
});

describe("evaluateSector", () => {
  it("detects strong_bullish when most are bullish", () => {
    const r = evaluateSector({ sectorName: "SEMI", symbols: [sn({ close: 35000, sma20: 34000, return20d: 15 }), sn({ close: 6000, sma20: 5800, return20d: 10 }), sn({ close: 12000, sma20: 11800, return20d: 8 })], timeframe: "1D", capturedAt: NOW });
    expect(["strong_bullish", "bullish"]).toContain(r.condition);
  });
  it("detects bearish", () => {
    const r = evaluateSector({ sectorName: "WEAK", symbols: [sn({ close: 25000, sma20: 28000, return20d: -12 }), sn({ close: 4500, sma20: 5000, return20d: -8 })], timeframe: "1D", capturedAt: NOW });
    expect(["bearish", "strong_bearish"]).toContain(r.condition);
  });
});

describe("evaluateSymbol", () => {
  it("detects strong_bullish with perfect MA", () => {
    const r = evaluateSymbol({ symbol: "7203.T", snapshot: sn({ close: 3500, sma20: 3200, sma50: 2900, sma200: 2600, rsi14: 62, volumeRatio20d: 2.1, distanceFrom52wHighPct: -1, drawdownFromRecentHighPct: -0.5 }), timeframe: "1D", capturedAt: NOW });
    expect(["strong_bullish", "bullish"]).toContain(r.condition);
    expect(r.strength).toBeGreaterThanOrEqual(72);
  });
  it("handles null snapshot", () => {
    const r = evaluateSymbol({ symbol: "UNKNOWN", snapshot: null, timeframe: "1D", capturedAt: NOW });
    expect(r.condition).toBe("neutral");
    expect(r.data_confidence).toBe(0);
  });
});

describe("computeAllLayers", () => {
  it("computes all layers", () => {
    const r = computeAllLayers({
      symbolSnapshots: { "8035.T": sn({ close: 35000, return20d: 15 }), "4063.T": sn({ close: 6000, return20d: 10 }) },
      benchmarkSnapshots: { Nikkei225: [sn({ close: 39000, sma20: 38500, sma50: 37000, rsi14: 60, return5d: 3, return20d: 6 })] },
      sectors: { SEMI: ["8035.T", "4063.T"] },
      themes: {},
      timeframe: "1D",
      capturedAt: NOW,
    });
    expect(r.market).not.toBeNull();
    expect(r.sectors).toHaveLength(1);
    expect(r.symbols).toHaveLength(2);
  });
  it("handles missing benchmark", () => {
    const r = computeAllLayers({ symbolSnapshots: { "7203.T": sn() }, benchmarkSnapshots: {}, sectors: {}, themes: {}, timeframe: "1D", capturedAt: NOW });
    expect(r.market).toBeNull();
    expect(r.symbols).toHaveLength(1);
  });
});
