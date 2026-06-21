import { describe, it, expect } from "vitest";
import { sma, rsi, atr, volumeIndicators, fiftyTwoWeekHighLow, drawdownFromRecentHigh, computeAllIndicators, computeDataConfidence } from "./calculator";
import type { IndicatorInput } from "./types";

function makeBars(n: number, startPrice = 100, step = 1, volume = 10000): IndicatorInput[] {
  const bars: IndicatorInput[] = [];
  for (let i = 0; i < n; i++) {
    const date = new Date(2024, 0, i + 1).toISOString().split("T")[0];
    const close = startPrice + step * i;
    bars.push({ date, open: close - step * 0.5, high: close + step * 0.5, low: close - step * 0.5, close, volume });
  }
  return bars;
}

describe("sma", () => {
  it("returns nulls for first period-1 bars", () => {
    const r = sma(makeBars(10, 100, 1), 5);
    expect(r[0]).toBeNull();
    expect(r[3]).toBeNull();
    expect(r[4]).not.toBeNull();
  });
  it("computes correct SMA", () => {
    const r = sma(makeBars(5, 100, 10), 3);
    expect(r[2]).toBeCloseTo(110, 1);
    expect(r[3]).toBeCloseTo(120, 1);
  });
  it("handles empty", () => { expect(sma([], 20)).toEqual([]); });
});

describe("rsi", () => {
  it("all-up series gives ~100", () => {
    const r = rsi(makeBars(30, 100, 2), 14);
    expect(r[29]!).toBeGreaterThan(90);
  });
  it("all-down series gives ~0", () => {
    const r = rsi(makeBars(30, 200, -2), 14);
    expect(r[29]!).toBeLessThan(10);
  });
});

describe("atr", () => {
  it("returns nulls for first period bars", () => {
    const r = atr(makeBars(20), 14);
    for (let i = 0; i < 14; i++) expect(r[i]).toBeNull();
    expect(r[14]).not.toBeNull();
  });
});

describe("fiftyTwoWeekHighLow", () => {
  it("finds high and low", () => {
    const bars = [
      { date: "2024-01-01", open: 90, high: 100, low: 85, close: 95, volume: 1000 },
      { date: "2024-01-02", open: 95, high: 120, low: 90, close: 110, volume: 1000 },
      { date: "2024-01-03", open: 110, high: 115, low: 80, close: 100, volume: 1000 },
    ];
    const r = fiftyTwoWeekHighLow(bars);
    expect(r.high).toBe(120);
    expect(r.low).toBe(80);
  });
});

describe("drawdownFromRecentHigh", () => {
  it("returns 0 for uptrend", () => {
    expect(drawdownFromRecentHigh(makeBars(30, 100, 1))).toBe(0);
  });
});

describe("computeAllIndicators", () => {
  it("produces indicators for each bar", () => {
    const result = computeAllIndicators(makeBars(70, 1000, 5, 50000));
    expect(result.indicators).toHaveLength(70);
    const last = result.indicators[69];
    expect(last.sma20).not.toBeNull();
    expect(last.rsi14).not.toBeNull();
  });
});

describe("computeDataConfidence", () => {
  it("returns 0 for empty data", () => {
    expect(computeDataConfidence({ bars: [], expectedBars: 60, maxAgeHours: 24 }).score).toBe(0);
  });
  it("penalizes incomplete data", () => {
    const r = computeDataConfidence({ bars: makeBars(20), expectedBars: 60, maxAgeHours: 24 });
    expect(r.score).toBeLessThan(70);
  });
});
