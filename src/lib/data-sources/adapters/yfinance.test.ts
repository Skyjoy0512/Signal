import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { YFinanceAdapter } from "./yfinance";
import type { OHLCVBar } from "../types";

function makeChartResponse(
  timestamps: number[],
  open: (number | null)[],
  high: (number | null)[],
  low: (number | null)[],
  close: (number | null)[],
  volume: (number | null)[],
  adjclose?: (number | null)[],
) {
  return {
    chart: {
      result: [{
        timestamp: timestamps,
        indicators: {
          quote: [{ open, high, low, close, volume }],
          ...(adjclose ? { adjclose: [{ adjclose }] } : {}),
        },
      }],
    },
  };
}

function callParse(adapter: YFinanceAdapter, symbol: string, data: unknown, tf: "1D" | "1W"): OHLCVBar[] | Error {
  return (adapter as unknown as { parseChartResponse(s: string, d: unknown, t: "1D" | "1W"): OHLCVBar[] | Error }).parseChartResponse(symbol, data, tf);
}
function callNorm(adapter: YFinanceAdapter, s: string): string {
  return (adapter as unknown as { normalizeSymbol(s: string): string }).normalizeSymbol(s);
}

describe("YFinanceAdapter", () => {
  let adapter: YFinanceAdapter;

  beforeEach(() => { adapter = new YFinanceAdapter(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe("normalizeSymbol", () => {
    it("appends .T to 4-digit numeric", () => expect(callNorm(adapter, "7203")).toBe("7203.T"));
    it("appends .T to 5-digit numeric", () => expect(callNorm(adapter, "99840")).toBe("99840.T"));
    it("keeps existing .T suffix", () => expect(callNorm(adapter, "7203.T")).toBe("7203.T"));
    it("keeps US stock suffix", () => expect(callNorm(adapter, "AAPL")).toBe("AAPL"));
  });

  describe("parseChartResponse", () => {
    it("parses valid daily OHLCV", () => {
      const data = makeChartResponse(
        [1719446400, 1719532800],
        [3100, 3150], [3150, 3200], [3080, 3120], [3120, 3180], [5000000, 6000000],
      );
      const result = callParse(adapter, "7203.T", data, "1D");
      expect(result).not.toBeInstanceOf(Error);
      const bars = result as OHLCVBar[];
      expect(bars).toHaveLength(2);
      expect(bars[0]).toMatchObject({ symbol: "7203.T", date: "2024-06-27", open: 3100, high: 3150, low: 3080, close: 3120, volume: 5000000, timeframe: "1D" });
    });

    it("skips bars with null OHLCV values", () => {
      const data = makeChartResponse(
        [1719446400, 1719532800, 1719619200],
        [3100, null, 3150], [3150, null, 3200], [3080, null, 3120], [3120, null, 3180], [5000000, null, 6000000],
      );
      const result = callParse(adapter, "7203.T", data, "1D");
      expect((result as OHLCVBar[])).toHaveLength(2);
    });

    it("sets adjustedClose correctly", () => {
      const data = makeChartResponse([1719446400], [3100], [3150], [3080], [3120], [5000000], [3090]);
      const bars = callParse(adapter, "7203.T", data, "1D") as OHLCVBar[];
      expect(bars[0].adjustedClose).toBe(3090);
    });

    it("returns null adjustedClose when absent", () => {
      const data = makeChartResponse([1719446400], [3100], [3150], [3080], [3120], [5000000]);
      const bars = callParse(adapter, "7203.T", data, "1D") as OHLCVBar[];
      expect(bars[0].adjustedClose).toBeNull();
    });

    it("returns Error for invalid structure", () => {
      expect(callParse(adapter, "7203.T", { foo: 1 }, "1D")).toBeInstanceOf(Error);
    });

    it("returns Error for empty result array", () => {
      expect(callParse(adapter, "7203.T", { chart: { result: [] } }, "1D")).toBeInstanceOf(Error);
    });
  });

  describe("fetchDailyBars", () => {
    it("returns bars on success", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeChartResponse([1719446400], [3100], [3150], [3080], [3120], [5000000])),
      } as Response);

      const result = await adapter.fetchDailyBars(["7203.T"], new Date("2024-06-01"), new Date("2024-06-30"));
      expect(result.bars).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.bars[0].symbol).toBe("7203.T");
    });

    it("collects errors for failed symbols", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
      const result = await adapter.fetchDailyBars(["7203.T"], new Date("2024-06-01"), new Date("2024-06-30"));
      expect(result.bars).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
    });

    it("handles HTTP error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false, status: 404 } as Response);
      const result = await adapter.fetchDailyBars(["INVALID"], new Date("2024-06-01"), new Date("2024-06-30"));
      expect(result.errors).toHaveLength(1);
    });
  });
});
