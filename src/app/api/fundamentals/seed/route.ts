import { NextResponse } from "next/server";
import { canUseSupabaseFundamentals, importFinancialStatementsFromText, refreshMarketMetricsFromYFinance, seedMockFundamentalsToSupabase } from "@/lib/fundamentals/importer";

export async function POST(request: Request) {
  const seedToken = process.env.FUNDAMENTALS_SEED_TOKEN;
  if (!seedToken) {
    return NextResponse.json(
      { error: "FUNDAMENTALS_SEED_TOKEN is required before seeding data" },
      { status: 400 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const headerToken = request.headers.get("x-seed-token");
  const bearerToken = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  if (headerToken !== seedToken && bearerToken !== seedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canUseSupabaseFundamentals()) {
    return NextResponse.json(
      {
        error: "Supabase is not configured",
        requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FUNDAMENTALS_SEED_TOKEN"],
      },
      { status: 400 },
    );
  }

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") ?? "mock";
    if (mode !== "mock" && mode !== "market" && mode !== "financials") {
      return NextResponse.json({ error: "Unsupported fundamentals seed mode" }, { status: 400 });
    }
    const tickers = url.searchParams.get("tickers");
    const source = url.searchParams.get("source") ?? undefined;
    const result = mode === "market"
      ? await refreshMarketMetricsFromYFinance({ tickers: tickers ? tickers.split(",") : undefined })
      : mode === "financials"
        ? await importFinancialStatementsFromText(await request.text(), source)
        : await seedMockFundamentalsToSupabase();
    return NextResponse.json({
      success: true,
      mode: mode === "market" ? "yfinance_market_metrics_refresh" : mode === "financials" ? "financial_statements_import" : "mock_fundamentals_seed",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed fundamentals" },
      { status: 500 },
    );
  }
}
