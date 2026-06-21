import type { MarketDataAdapter, FetchResult, OHLCVBar } from "../types";

export class YFinanceAdapter implements MarketDataAdapter {
  readonly provider = "yfinance";
  private readonly baseUrl: string;
  constructor() { this.baseUrl = process.env.YFINANCE_PROXY_URL ? process.env.YFINANCE_PROXY_URL.replace(/\/$/, "") : "https://query1.finance.yahoo.com"; }

  async fetchDailyBars(symbols: string[], from: Date, to: Date): Promise<FetchResult> { return this.fetchBars(symbols, from, to, "1D", "1d"); }
  async fetchWeeklyBars(symbols: string[], from: Date, to: Date): Promise<FetchResult> { return this.fetchBars(symbols, from, to, "1W", "1wk"); }

  private async fetchBars(symbols: string[], from: Date, to: Date, timeframe: "1D" | "1W", interval: string): Promise<FetchResult> {
    const bars: OHLCVBar[] = [];
    const errors: Array<{ symbol: string; message: string }> = [];
    const period1 = Math.floor(from.getTime() / 1000);
    const period2 = Math.floor(to.getTime() / 1000);
    const results = await Promise.allSettled(symbols.map(async (symbol) => {
      const normalized = this.normalizeSymbol(symbol);
      const url = `${this.baseUrl}/v8/finance/chart/${encodeURIComponent(normalized)}?interval=${interval}&period1=${period1}&period2=${period2}`;
      const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { symbol, data: await response.json() };
    }));
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { symbol, data } = result.value;
        const parsed = this.parseChartResponse(symbol, data, timeframe);
        if (parsed instanceof Error) errors.push({ symbol, message: parsed.message });
        else bars.push(...parsed);
      } else { errors.push({ symbol: "unknown", message: result.reason?.message ?? "Error" }); }
    }
    return { bars, errors };
  }

  private normalizeSymbol(symbol: string): string {
    if (/\.[A-Z]+$/.test(symbol)) return symbol;
    if (/^\d{4,5}$/.test(symbol)) return `${symbol}.T`;
    return symbol;
  }

  private parseChartResponse(symbol: string, data: unknown, timeframe: "1D" | "1W"): OHLCVBar[] | Error {
    const chart = (data as Record<string, unknown>)?.chart;
    if (!chart || typeof chart !== "object") return new Error("Invalid chart response");
    const result = (chart as Record<string, unknown>)?.result;
    if (!Array.isArray(result) || result.length === 0) return new Error("No data");
    const r = result[0] as Record<string, unknown>;
    const timestamps = r.timestamp as number[] | undefined;
    const indicators = r.indicators as Record<string, unknown> | undefined;
    const quoteArr = indicators?.quote as Array<Record<string, unknown>> | undefined;
    const quote = quoteArr?.[0];
    const adjcloseArr = indicators?.adjclose as Array<Record<string, unknown>> | undefined;
    const adjCloseArr = adjcloseArr?.[0]?.adjclose as number[] | undefined;
    if (!timestamps || !quote) return new Error("Missing data");
    const open = quote.open as (number | null)[], high = quote.high as (number | null)[], low = quote.low as (number | null)[], close = quote.close as (number | null)[], volume = quote.volume as (number | null)[];
    if (!open || !high || !low || !close || !volume) return new Error("Incomplete OHLCV");
    const bars: OHLCVBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (open[i] === null || high[i] === null || low[i] === null || close[i] === null || volume[i] === null) continue;
      bars.push({ symbol, date: new Date(timestamps[i] * 1000).toISOString().split("T")[0], open: open[i]!, high: high[i]!, low: low[i]!, close: close[i]!, adjustedClose: adjCloseArr?.[i] ?? null, volume: volume[i]!, timeframe });
    }
    return bars.length > 0 ? bars : new Error("No valid bars");
  }
}
