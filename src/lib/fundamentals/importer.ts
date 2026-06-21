import { createClient } from "@/lib/supabase/server";
import { companies, financialsFor, metricsFor } from "./mock";

export type SeedFundamentalsResult = {
  symbols: number;
  financialStatements: number;
  marketMetrics: number;
  capturedAt: string;
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
