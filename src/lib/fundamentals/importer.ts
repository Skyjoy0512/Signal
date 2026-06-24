import { createClient } from "@/lib/supabase/server";
import { YFinanceAdapter } from "../data-sources/adapters/yfinance";
import type { MarketDataAdapter, OHLCVBar } from "../data-sources/types";
import { companies, financialsFor, metricsFor } from "./mock";

export type SeedFundamentalsResult = {
  symbols: number;
  financialStatements: number;
  marketMetrics: number;
  capturedAt: string;
};

export type RefreshMarketMetricsResult = {
  symbols: number;
  marketMetrics: number;
  capturedAt: string;
  source: "yfinance";
  errors: Array<{ symbol: string; message: string }>;
};

export type RefreshMarketMetricsOptions = {
  tickers?: string[];
  adapter?: Pick<MarketDataAdapter, "fetchDailyBars">;
  capturedAt?: string;
  lookbackDays?: number;
};

export type ImportFinancialStatementsResult = {
  financialStatements: number;
  source: string;
};

type FinancialStatementImportRow = {
  ticker?: unknown;
  period?: unknown;
  period_type?: unknown;
  fiscal_year?: unknown;
  fiscal_month?: unknown;
  revenue?: unknown;
  operating_income?: unknown;
  net_income?: unknown;
  assets?: unknown;
  equity?: unknown;
  liabilities?: unknown;
  operating_cash_flow?: unknown;
  roe?: unknown;
  operating_margin?: unknown;
  source?: unknown;
  source_url?: unknown;
};

const financialStatementColumnAliases: Record<string, keyof FinancialStatementImportRow> = {
  "ticker": "ticker",
  "symbol": "ticker",
  "code": "ticker",
  "security_code": "ticker",
  "銘柄コード": "ticker",
  "証券コード": "ticker",
  "コード": "ticker",
  "period": "period",
  "fiscal_period": "period",
  "year": "period",
  "年度": "period",
  "会計年度": "period",
  "対象年度": "period",
  "period_type": "period_type",
  "期間種別": "period_type",
  "fiscal_year": "fiscal_year",
  "決算年": "fiscal_year",
  "fiscal_month": "fiscal_month",
  "決算月": "fiscal_month",
  "revenue": "revenue",
  "sales": "revenue",
  "net_sales": "revenue",
  "売上高": "revenue",
  "営業収益": "revenue",
  "operating_revenue": "revenue",
  "operating_income": "operating_income",
  "営業利益": "operating_income",
  "net_income": "net_income",
  "profit": "net_income",
  "当期純利益": "net_income",
  "親会社株主に帰属する当期純利益": "net_income",
  "assets": "assets",
  "total_assets": "assets",
  "総資産": "assets",
  "資産合計": "assets",
  "equity": "equity",
  "net_assets": "equity",
  "純資産": "equity",
  "自己資本": "equity",
  "liabilities": "liabilities",
  "total_liabilities": "liabilities",
  "負債": "liabilities",
  "負債合計": "liabilities",
  "operating_cash_flow": "operating_cash_flow",
  "operating_cf": "operating_cash_flow",
  "営業キャッシュフロー": "operating_cash_flow",
  "営業活動によるキャッシュフロー": "operating_cash_flow",
  "roe": "roe",
  "ROE": "roe",
  "自己資本利益率": "roe",
  "operating_margin": "operating_margin",
  "営業利益率": "operating_margin",
  "source": "source",
  "データソース": "source",
  "source_url": "source_url",
  "url": "source_url",
  "出典URL": "source_url",
};

export function canUseSupabaseFundamentals() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function seedMockFundamentalsToSupabase(): Promise<SeedFundamentalsResult> {
  if (!canUseSupabaseFundamentals()) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const supabase = await createClient();
  const capturedAt = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

  const symbolRows = companies.map((company) => ({
    symbol: company.ticker,
    name: company.name,
    asset_type: "jp_stock",
    exchange: company.exchange,
    currency: "JPY",
    sector: company.industry,
    industry: company.industry,
    country: "JP",
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  const financialRows = companies.flatMap((company) =>
    financialsFor(company.ticker).map((point) => ({
      ticker: company.ticker,
      period: point.year,
      period_type: "annual",
      fiscal_year: Number.parseInt(point.year, 10) || null,
      fiscal_month: company.fiscalMonth,
      revenue: point.revenue,
      operating_income: point.operatingIncome,
      net_income: point.netIncome,
      assets: point.assets,
      equity: point.equity,
      liabilities: point.liabilities,
      operating_cash_flow: point.operatingCashFlow,
      roe: point.roe,
      operating_margin: point.operatingMargin,
      source: "signal_mock_seed",
      raw_json: point,
    })),
  );

  const metricRows = companies.map((company) => {
    const metrics = metricsFor(company.ticker);
    return {
      ticker: company.ticker,
      captured_at: capturedAt,
      stock_price: metrics.stockPrice,
      market_cap: metrics.marketCap,
      enterprise_value: metrics.enterpriseValue,
      per: metrics.per,
      pbr: metrics.pbr,
      ev_ebitda: metrics.evEbitda,
      psr: metrics.psr,
      dividend_yield: metrics.dividendYield,
      roe: metrics.roe,
      roic: metrics.roic,
      roa: metrics.roa,
      source: "signal_mock_seed",
      raw_json: metrics,
    };
  });

  const symbolResult = await supabase.from("symbols").upsert(symbolRows, { onConflict: "symbol" });
  if (symbolResult.error) throw new Error(`symbols upsert failed: ${symbolResult.error.message}`);

  const financialResult = await supabase
    .from("financial_statements")
    .upsert(financialRows, { onConflict: "ticker,period,period_type" });
  if (financialResult.error) throw new Error(`financial_statements upsert failed: ${financialResult.error.message}`);

  const metricResult = await supabase
    .from("market_metrics")
    .upsert(metricRows, { onConflict: "ticker,captured_at" });
  if (metricResult.error) throw new Error(`market_metrics upsert failed: ${metricResult.error.message}`);

  return {
    symbols: symbolRows.length,
    financialStatements: financialRows.length,
    marketMetrics: metricRows.length,
    capturedAt,
  };
}

export async function refreshMarketMetricsFromYFinance(options: RefreshMarketMetricsOptions = {}): Promise<RefreshMarketMetricsResult> {
  if (!canUseSupabaseFundamentals()) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const supabase = await createClient();
  const capturedAt = options.capturedAt ?? `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
  const tickers = normalizeTickers(options.tickers?.length ? options.tickers : await getActiveTickers(supabase));
  if (tickers.length === 0) {
    return { symbols: 0, marketMetrics: 0, capturedAt, source: "yfinance", errors: [] };
  }

  const to = new Date(capturedAt);
  to.setUTCDate(to.getUTCDate() + 1);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (options.lookbackDays ?? 10));

  const adapter = options.adapter ?? new YFinanceAdapter();
  const { bars, errors } = await adapter.fetchDailyBars(tickers, from, to);
  const latestBars = latestBarByTicker(bars);
  const metricRows = tickers.flatMap((ticker) => {
    const bar = latestBars.get(ticker);
    return bar ? [marketMetricRowFromBar(ticker, capturedAt, bar)] : [];
  });

  if (metricRows.length > 0) {
    const metricResult = await supabase
      .from("market_metrics")
      .upsert(metricRows, { onConflict: "ticker,captured_at" });
    if (metricResult.error) throw new Error(`market_metrics upsert failed: ${metricResult.error.message}`);
  }

  const missingErrors = tickers
    .filter((ticker) => !latestBars.has(ticker))
    .map((ticker) => ({ symbol: ticker, message: "No valid latest market bar" }));

  return {
    symbols: tickers.length,
    marketMetrics: metricRows.length,
    capturedAt,
    source: "yfinance",
    errors: [...errors, ...missingErrors],
  };
}

export async function importFinancialStatementsFromText(text: string, source = "financial_statement_import"): Promise<ImportFinancialStatementsResult> {
  if (!canUseSupabaseFundamentals()) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const rows = parseFinancialStatementRows(text).map((row) => financialStatementRowForUpsert(normalizeFinancialStatementRow(row), source));
  if (rows.length === 0) {
    return { financialStatements: 0, source };
  }

  const supabase = await createClient();
  const result = await supabase
    .from("financial_statements")
    .upsert(rows, { onConflict: "ticker,period,period_type" });
  if (result.error) throw new Error(`financial_statements upsert failed: ${result.error.message}`);
  return { financialStatements: rows.length, source };
}

export function parseFinancialStatementRows(text: string): FinancialStatementImportRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.split(/\r?\n/).every((line) => line.trim().startsWith("{"))) {
    return trimmed.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) as FinancialStatementImportRow[];
  }
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    return (Array.isArray(parsed) ? parsed : [parsed]) as FinancialStatementImportRow[];
  }
  return parseCsv(trimmed) as FinancialStatementImportRow[];
}

function normalizeFinancialStatementRow(row: FinancialStatementImportRow): FinancialStatementImportRow {
  const normalized: FinancialStatementImportRow = {};
  for (const [key, value] of Object.entries(row)) {
    const canonicalKey = financialStatementColumnAliases[key.trim()] ?? financialStatementColumnAliases[normalizeHeader(key)];
    if (canonicalKey && normalized[canonicalKey] == null) {
      normalized[canonicalKey] = value;
    }
  }
  return normalized;
}

function financialStatementRowForUpsert(row: FinancialStatementImportRow, defaultSource: string) {
  const ticker = normalizeTicker(requiredString(row.ticker, "ticker"));
  const period = requiredString(row.period, "period");
  const periodType = stringOrNull(row.period_type) ?? "annual";
  return {
    ticker,
    period,
    period_type: periodType,
    fiscal_year: numberOrNull(row.fiscal_year) ?? (Number.parseInt(period, 10) || null),
    fiscal_month: numberOrNull(row.fiscal_month),
    revenue: numberOrNull(row.revenue),
    operating_income: numberOrNull(row.operating_income),
    net_income: numberOrNull(row.net_income),
    assets: numberOrNull(row.assets),
    equity: numberOrNull(row.equity),
    liabilities: numberOrNull(row.liabilities),
    operating_cash_flow: numberOrNull(row.operating_cash_flow),
    roe: numberOrNull(row.roe),
    operating_margin: numberOrNull(row.operating_margin),
    source: stringOrNull(row.source) ?? defaultSource,
    source_url: stringOrNull(row.source_url),
    raw_json: row,
    updated_at: new Date().toISOString(),
  };
}

async function getActiveTickers(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string[]> {
  const { data, error } = await supabase
    .from("symbols")
    .select("symbol")
    .eq("asset_type", "jp_stock")
    .eq("is_active", true)
    .order("symbol", { ascending: true })
    .limit(700);
  if (error) throw new Error(`symbols select failed: ${error.message}`);
  return (data ?? []).map((row: { symbol?: string | null }) => row.symbol).filter(isNonEmptyString);
}

function marketMetricRowFromBar(ticker: string, capturedAt: string, bar: OHLCVBar) {
  const fallback = metricsFor(ticker);
  const priceRatio = fallback.stockPrice > 0 ? bar.close / fallback.stockPrice : 1;
  return {
    ticker,
    captured_at: capturedAt,
    stock_price: bar.close,
    market_cap: Math.round(fallback.marketCap * priceRatio),
    enterprise_value: Math.round(fallback.enterpriseValue * priceRatio),
    per: fallback.per,
    pbr: fallback.pbr,
    ev_ebitda: fallback.evEbitda,
    psr: fallback.psr,
    dividend_yield: fallback.dividendYield,
    roe: fallback.roe,
    roic: fallback.roic,
    roa: fallback.roa,
    source: "yfinance",
    source_url: `https://finance.yahoo.co.jp/quote/${encodeURIComponent(ticker)}`,
    raw_json: {
      bar,
      fallbackMetrics: {
        source: "signal_estimated_fundamentals",
        stockPrice: fallback.stockPrice,
        marketCap: fallback.marketCap,
        enterpriseValue: fallback.enterpriseValue,
      },
    },
  };
}

function latestBarByTicker(bars: OHLCVBar[]) {
  const latest = new Map<string, OHLCVBar>();
  for (const bar of bars) {
    const ticker = normalizeTicker(bar.symbol);
    const current = latest.get(ticker);
    if (!current || bar.date > current.date) latest.set(ticker, { ...bar, symbol: ticker });
  }
  return latest;
}

function normalizeTickers(tickers: string[]) {
  return [...new Set(tickers.map(normalizeTicker).filter(isNonEmptyString))];
}

function normalizeTicker(ticker: string) {
  const trimmed = ticker.trim().toUpperCase();
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}.T`;
  return trimmed;
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const rows = csvRows(text);
  const [header, ...body] = rows;
  if (!header?.length) return [];
  return body
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => Object.fromEntries(header.map((key, index) => [key.trim(), row[index]?.trim() ?? ""])));
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s\-()（）]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      cell += "\"";
      i++;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

function requiredString(value: unknown, label: string): string {
  const result = stringOrNull(value);
  if (!result) throw new Error(`${label} is required`);
  return result;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}
