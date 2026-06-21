import { createClient } from "@/lib/supabase/server";
import type { Symbol as DbSymbol, Json } from "@/lib/supabase/types";
import {
  companies as mockCompanies,
  enrichedCompanies as mockEnrichedCompanies,
  financialsFor as mockFinancialsFor,
  industrySummary as mockIndustrySummary,
  metricsFor as mockMetricsFor,
  tso33Industries,
  type Company,
  type FinancialPoint,
  type MarketMetric,
} from "./mock";

export type FundamentalSource = "mock" | "supabase-hybrid" | "supabase-fundamentals";

export type EnrichedCompany = Company & {
  latest: FinancialPoint;
  metrics: MarketMetric;
};

export type IndustrySummary = {
  code: string;
  name: string;
  count: number;
  revenue: number;
  avgMargin: number;
  avgRoe: number;
};

export type FundamentalDataset = {
  source: FundamentalSource;
  sourceLabel: string;
  companies: EnrichedCompany[];
  industries: IndustrySummary[];
  generatedAt: string;
};

const industryNameToCode = new Map(tso33Industries.map(([code, name]) => [normalizeIndustryName(name), code]));

type FinancialStatementRow = {
  ticker: string;
  period: string;
  period_type: string | null;
  revenue: number | null;
  operating_income: number | null;
  net_income: number | null;
  assets: number | null;
  equity: number | null;
  liabilities: number | null;
  operating_cash_flow: number | null;
  roe: number | null;
  operating_margin: number | null;
};

type MarketMetricRow = {
  ticker: string;
  captured_at: string;
  stock_price: number | null;
  market_cap: number | null;
  enterprise_value: number | null;
  per: number | null;
  pbr: number | null;
  ev_ebitda: number | null;
  psr: number | null;
  dividend_yield: number | null;
  roe: number | null;
  roic: number | null;
  roa: number | null;
};

export async function getFundamentalDataset(): Promise<FundamentalDataset> {
  const generatedAt = new Date().toISOString();
  if (!hasSupabaseEnv()) return buildMockDataset(generatedAt);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("symbols")
      .select("*")
      .eq("asset_type", "jp_stock")
      .eq("is_active", true)
      .order("symbol", { ascending: true })
      .limit(700);

    if (error || !data?.length) return buildMockDataset(generatedAt);

    const rows = (data as DbSymbol[]).map(symbolToCompany);
    const tickers = rows.map((row) => row.ticker);
    const [financialRows, metricRows] = await Promise.all([
      getFinancialStatements(tickers),
      getMarketMetrics(tickers),
    ]);
    const enriched = rows.map((company) => enrichCompany(company, financialRows, metricRows));
    const hasRealFinancials = financialRows.size > 0 || metricRows.size > 0;
    return {
      source: hasRealFinancials ? "supabase-fundamentals" : "supabase-hybrid",
      sourceLabel: hasRealFinancials
        ? `Supabase実データ (${enriched.length}銘柄 / 財務${financialRows.size} / 指標${metricRows.size})`
        : `Supabase銘柄マスター + 推定財務 (${enriched.length}銘柄)`,
      companies: enriched,
      industries: summarizeIndustries(enriched),
      generatedAt,
    };
  } catch {
    return buildMockDataset(generatedAt);
  }
}

export async function getCompanyBundle(ticker: string) {
  const dataset = await getFundamentalDataset();
  const normalized = normalizeTicker(ticker);
  const company = dataset.companies.find((row) => normalizeTicker(row.ticker) === normalized);
  if (!company) return null;
  const [financialRows, metricRows] = hasSupabaseEnv()
    ? await Promise.all([getFinancialStatements([company.ticker]), getMarketMetrics([company.ticker])])
    : [undefined, undefined] as const;
  const financials = financialsFor(company.ticker, financialRows);
  const metrics = metricsFor(company.ticker, metricRows);
  const peers = dataset.companies
    .filter((peer) => peer.industryCode === company.industryCode && peer.ticker !== company.ticker)
    .slice(0, 8);
  return {
    source: dataset.source,
    sourceLabel: dataset.sourceLabel,
    company: { ...company, latest: financials[financials.length - 1], metrics },
    financials,
    metrics,
    peers,
  };
}

export async function getIndustryRows(industryCode: string) {
  const dataset = await getFundamentalDataset();
  const industry = tso33Industries.find(([code]) => code === industryCode);
  const rows = dataset.companies
    .filter((company) => company.industryCode === industryCode)
    .sort((a, b) => b.latest.revenue - a.latest.revenue);
  return { dataset, industry, rows };
}

export function financialsFor(ticker: string, rows?: Map<string, FinancialStatementRow[]>) {
  const realRows = rows?.get(normalizeTicker(ticker));
  if (realRows?.length) return realRows.map(financialRowToPoint);
  return mockFinancialsFor(ticker);
}

export function metricsFor(ticker: string, rows?: Map<string, MarketMetricRow>) {
  const realRow = rows?.get(normalizeTicker(ticker));
  if (realRow) return marketMetricRowToMetric(normalizeTicker(ticker), realRow);
  return mockMetricsFor(ticker);
}

function buildMockDataset(generatedAt: string): FundamentalDataset {
  return {
    source: "mock",
    sourceLabel: `モック大型株サンプル (${mockCompanies.length}銘柄)`,
    companies: mockEnrichedCompanies(),
    industries: mockIndustrySummary(),
    generatedAt,
  };
}

function enrichCompany(
  company: Company,
  financialRows?: Map<string, FinancialStatementRow[]>,
  metricRows?: Map<string, MarketMetricRow>,
): EnrichedCompany {
  const financials = financialsFor(company.ticker, financialRows);
  return {
    ...company,
    latest: financials[financials.length - 1],
    metrics: metricsFor(company.ticker, metricRows),
  };
}

async function getFinancialStatements(tickers: string[]) {
  const result = new Map<string, FinancialStatementRow[]>();
  if (tickers.length === 0) return result;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("financial_statements")
      .select("*")
      .in("ticker", tickers)
      .eq("period_type", "annual")
      .order("period", { ascending: true });
    if (error || !data) return result;
    for (const row of data as FinancialStatementRow[]) {
      const ticker = normalizeTicker(row.ticker);
      const rows = result.get(ticker) ?? [];
      rows.push(row);
      result.set(ticker, rows);
    }
  } catch {
    return result;
  }
  return result;
}

async function getMarketMetrics(tickers: string[]) {
  const result = new Map<string, MarketMetricRow>();
  if (tickers.length === 0) return result;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("market_metrics")
      .select("*")
      .in("ticker", tickers)
      .order("captured_at", { ascending: false });
    if (error || !data) return result;
    for (const row of data as MarketMetricRow[]) {
      const ticker = normalizeTicker(row.ticker);
      if (!result.has(ticker)) result.set(ticker, row);
    }
  } catch {
    return result;
  }
  return result;
}

function summarizeIndustries(rows: EnrichedCompany[]): IndustrySummary[] {
  return tso33Industries.map(([code, name]) => {
    const industryRows = rows.filter((company) => company.industryCode === code);
    const revenue = industryRows.reduce((sum, company) => sum + company.latest.revenue, 0);
    const avgMargin = average(industryRows.map((company) => company.latest.operatingMargin));
    const avgRoe = average(industryRows.map((company) => company.latest.roe));
    return {
      code,
      name,
      count: industryRows.length,
      revenue: Math.round(revenue),
      avgMargin: round1(avgMargin),
      avgRoe: round1(avgRoe),
    };
  });
}

function symbolToCompany(symbol: DbSymbol): Company {
  const industry = symbol.industry || symbol.sector || "未分類";
  const industryCode = industryCodeForName(industry);
  const ticker = normalizeTicker(symbol.symbol);
  return {
    id: symbol.id,
    ticker,
    name: symbol.name || ticker,
    market: symbol.exchange || "東証",
    exchange: symbol.exchange || "東証",
    industry,
    industryCode,
    themeTags: [symbol.sector, symbol.industry].filter(isNonEmptyString),
    description: `${symbol.name || ticker}は${industry}に属する銘柄です。Supabase銘柄マスターを元に表示しています。`,
    fiscalMonth: 3,
  };
}

function financialRowToPoint(row: FinancialStatementRow): FinancialPoint {
  const revenue = row.revenue ?? 0;
  const operatingIncome = row.operating_income ?? 0;
  const netIncome = row.net_income ?? 0;
  const assets = row.assets ?? 0;
  const equity = row.equity ?? 0;
  const liabilities = row.liabilities ?? Math.max(0, assets - equity);
  return {
    year: row.period,
    revenue: Math.round(revenue),
    operatingIncome: Math.round(operatingIncome),
    netIncome: Math.round(netIncome),
    assets: Math.round(assets),
    equity: Math.round(equity),
    liabilities: Math.round(liabilities),
    operatingCashFlow: Math.round(row.operating_cash_flow ?? netIncome),
    roe: round1(row.roe ?? safePct(netIncome, equity)),
    operatingMargin: round1(row.operating_margin ?? safePct(operatingIncome, revenue)),
  };
}

function marketMetricRowToMetric(ticker: string, row: MarketMetricRow): MarketMetric {
  const fallback = mockMetricsFor(ticker);
  return {
    ticker,
    stockPrice: row.stock_price ?? fallback.stockPrice,
    marketCap: row.market_cap ?? fallback.marketCap,
    enterpriseValue: row.enterprise_value ?? fallback.enterpriseValue,
    per: row.per ?? fallback.per,
    pbr: row.pbr ?? fallback.pbr,
    evEbitda: row.ev_ebitda ?? fallback.evEbitda,
    psr: row.psr ?? fallback.psr,
    dividendYield: row.dividend_yield ?? fallback.dividendYield,
    roe: row.roe ?? fallback.roe,
    roic: row.roic ?? fallback.roic,
    roa: row.roa ?? fallback.roa,
  };
}

function hasSupabaseEnv() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function industryCodeForName(name: string) {
  const normalized = normalizeIndustryName(name);
  return industryNameToCode.get(normalized) ?? "33";
}

function normalizeIndustryName(name: string) {
  return name.replace(/[・、\s]/g, "").replace(/業$/g, "");
}

function normalizeTicker(ticker: string) {
  const trimmed = ticker.trim().toUpperCase();
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}.T`;
  return trimmed;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function safePct(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

function isNonEmptyString(value: Json | string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}
