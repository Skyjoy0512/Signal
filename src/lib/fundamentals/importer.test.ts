import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OHLCVBar } from "@/lib/data-sources/types";

const mockState = vi.hoisted(() => ({
  builders: [] as MockBuilder[],
  nextRows: [] as unknown[],
}));

class MockBuilder {
  calls: Array<{ method: string; args: unknown[] }> = [];

  constructor(readonly table: string) {}

  select(columns?: unknown) { this.calls.push({ method: "select", args: columns === undefined ? [] : [columns] }); return this; }
  eq(column: string, value: unknown) { this.calls.push({ method: "eq", args: [column, value] }); return this; }
  order(column: string, options?: unknown) { this.calls.push({ method: "order", args: [column, options] }); return this; }
  limit(value: number) { this.calls.push({ method: "limit", args: [value] }); return this; }
  upsert(payload: unknown, options?: unknown) { this.calls.push({ method: "upsert", args: [payload, options] }); return Promise.resolve({ error: null }); }
  then(resolve: (value: { data: unknown[]; error: null }) => void) {
    resolve({ data: mockState.nextRows, error: null });
  }
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from(table: string) {
      const builder = new MockBuilder(table);
      mockState.builders.push(builder);
      return builder;
    },
  })),
}));

import { importFinancialStatementsFromText, parseFinancialStatementRows, refreshMarketMetricsFromYFinance } from "./importer";

const originalEnv = { ...process.env };

beforeEach(() => {
  mockState.builders = [];
  mockState.nextRows = [];
  process.env.SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("refreshMarketMetricsFromYFinance", () => {
  it("upserts latest Yahoo market bars into market_metrics", async () => {
    const adapter = adapterWithBars([
      bar("7203", "2026-06-21", 3000),
      bar("7203", "2026-06-24", 3100),
      bar("8035.T", "2026-06-24", 42000),
    ]);

    const result = await refreshMarketMetricsFromYFinance({
      tickers: ["7203", "8035.T"],
      capturedAt: "2026-06-24T00:00:00.000Z",
      adapter,
    });

    expect(result).toMatchObject({ symbols: 2, marketMetrics: 2, source: "yfinance", errors: [] });
    const metricBuilder = mockState.builders.find((builder) => builder.table === "market_metrics");
    const upsert = metricBuilder?.calls.find((call) => call.method === "upsert");
    expect(upsert?.args[1]).toEqual({ onConflict: "ticker,captured_at" });
    expect(upsert?.args[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ticker: "7203.T",
        captured_at: "2026-06-24T00:00:00.000Z",
        stock_price: 3100,
        source: "yfinance",
        source_url: "https://finance.yahoo.co.jp/quote/7203.T",
      }),
      expect.objectContaining({
        ticker: "8035.T",
        stock_price: 42000,
      }),
    ]));
  });

  it("uses active Supabase symbols when tickers are not provided", async () => {
    mockState.nextRows = [{ symbol: "7203" }];
    const result = await refreshMarketMetricsFromYFinance({
      capturedAt: "2026-06-24T00:00:00.000Z",
      adapter: adapterWithBars([bar("7203.T", "2026-06-24", 3100)]),
    });

    expect(result.marketMetrics).toBe(1);
    expect(mockState.builders[0].table).toBe("symbols");
    expect(mockState.builders[0].calls).toEqual(expect.arrayContaining([
      { method: "eq", args: ["asset_type", "jp_stock"] },
      { method: "eq", args: ["is_active", true] },
    ]));
  });

  it("returns missing-bar errors without writing empty rows", async () => {
    const result = await refreshMarketMetricsFromYFinance({
      tickers: ["7203"],
      capturedAt: "2026-06-24T00:00:00.000Z",
      adapter: adapterWithBars([]),
    });

    expect(result).toMatchObject({ symbols: 1, marketMetrics: 0 });
    expect(result.errors).toEqual([{ symbol: "7203.T", message: "No valid latest market bar" }]);
    expect(mockState.builders.some((builder) => builder.table === "market_metrics")).toBe(false);
  });
});

describe("financial statement import", () => {
  it("parses CSV and upserts financial statements", async () => {
    const csv = [
      "ticker,period,period_type,fiscal_year,fiscal_month,revenue,operating_income,net_income,assets,equity,liabilities,operating_cash_flow,roe,operating_margin,source_url",
      "7203,2026,annual,2026,3,\"48,000\",5000,3900,90000,36000,54000,4300,10.8,10.4,https://example.com/7203",
    ].join("\n");

    const result = await importFinancialStatementsFromText(csv, "edinet_csv");

    expect(result).toEqual({ financialStatements: 1, source: "edinet_csv" });
    const financialBuilder = mockState.builders.find((builder) => builder.table === "financial_statements");
    const upsert = financialBuilder?.calls.find((call) => call.method === "upsert");
    expect(upsert?.args[1]).toEqual({ onConflict: "ticker,period,period_type" });
    expect(upsert?.args[0]).toEqual([
      expect.objectContaining({
        ticker: "7203.T",
        period: "2026",
        period_type: "annual",
        fiscal_year: 2026,
        revenue: 48000,
        operating_income: 5000,
        net_income: 3900,
        source: "edinet_csv",
        source_url: "https://example.com/7203",
      }),
    ]);
  });

  it("parses JSONL financial statements", () => {
    expect(parseFinancialStatementRows([
      JSON.stringify({ ticker: "7203", period: "2025", revenue: 45000 }),
      JSON.stringify({ ticker: "8035.T", period: "2025", revenue: 22000 }),
    ].join("\n"))).toHaveLength(2);
  });

  it("accepts common Japanese financial statement headers", async () => {
    const csv = [
      "銘柄コード,年度,期間種別,決算月,売上高,営業利益,当期純利益,総資産,純資産,負債合計,営業活動によるキャッシュフロー,自己資本利益率,営業利益率,出典URL",
      "7203,2026,annual,3,48000,5000,3900,90000,36000,54000,4300,10.8,10.4,https://example.com/jp",
    ].join("\n");

    await importFinancialStatementsFromText(csv, "japanese_csv");

    const financialBuilder = mockState.builders.find((builder) => builder.table === "financial_statements");
    const upsert = financialBuilder?.calls.find((call) => call.method === "upsert");
    expect(upsert?.args[0]).toEqual([
      expect.objectContaining({
        ticker: "7203.T",
        period: "2026",
        revenue: 48000,
        operating_income: 5000,
        net_income: 3900,
        assets: 90000,
        equity: 36000,
        liabilities: 54000,
        operating_cash_flow: 4300,
        roe: 10.8,
        operating_margin: 10.4,
        source: "japanese_csv",
        source_url: "https://example.com/jp",
      }),
    ]);
  });

  it("requires ticker and period for financial statement imports", async () => {
    await expect(importFinancialStatementsFromText("ticker,period,revenue\n7203,,1000")).rejects.toThrow("period is required");
  });
});

function adapterWithBars(bars: OHLCVBar[]) {
  return {
    fetchDailyBars: vi.fn(async () => ({ bars, errors: [] })),
  };
}

function bar(symbol: string, date: string, close: number): OHLCVBar {
  return {
    symbol,
    date,
    open: close - 10,
    high: close + 20,
    low: close - 30,
    close,
    adjustedClose: close,
    volume: 1_000_000,
    timeframe: "1D",
  };
}
