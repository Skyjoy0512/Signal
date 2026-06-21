import { NextResponse } from "next/server";
import { runMockScan } from "@/lib/mock/provider";

export async function GET() {
  try {
    const result = await runMockScan();
    const storylineMap = new Map(result.storylineSets.map((storyline) => [storyline.symbol, storyline]));
    const symbolLayerMap = new Map(result.context.layerResults.symbols.map((layer) => [layer.scope_key, layer]));
    const sectorLayerMap = new Map(result.context.layerResults.sectors.map((layer) => [layer.scope_key, layer]));
    const themeLayerMap = new Map(result.context.layerResults.themes.map((layer) => [layer.scope_key, layer]));

    const symbolRelatedGroupMap = new Map<string, string[]>();
    for (const [group, symbols] of Object.entries(result.context.sectors)) {
      for (const symbol of symbols) {
        const current = symbolRelatedGroupMap.get(symbol) ?? [];
        current.push(group);
        symbolRelatedGroupMap.set(symbol, current);
      }
    }

    const symbolThemeMap = new Map<string, string[]>();
    for (const [theme, symbols] of Object.entries(result.context.themes)) {
      for (const symbol of symbols) {
        const current = symbolThemeMap.get(symbol) ?? [];
        current.push(theme);
        symbolThemeMap.set(symbol, current);
      }
    }

    const signals = result.scoredSymbols.map((s) => {
      const sector = s.symbol.sector ?? "UNCLASSIFIED";
      const themes = [...(symbolRelatedGroupMap.get(s.symbol.symbol) ?? []), ...(symbolThemeMap.get(s.symbol.symbol) ?? [])];
      const symbolLayer = symbolLayerMap.get(s.symbol.symbol) ?? s.layer;
      const sectorLayer = sectorLayerMap.get(sector) ?? null;
      const primaryThemeLayer = themes[0] ? themeLayerMap.get(themes[0]) ?? sectorLayerMap.get(themes[0]) ?? null : null;

      return {
      symbol: s.symbol.symbol,
      name: s.symbol.name,
      sector,
      industry: s.symbol.industry,
      themes,
      action: s.classification.action,
      tier: s.classification.tier,
      scores: {
        opportunity: s.scores.opportunityScore,
        entryTiming: s.scores.entryTimingScore,
        risk: s.scores.riskScore,
        conviction: s.scores.convictionScore,
        final: s.scores.finalEntryScore,
      },
      scenario: s.classification.scenario,
      storyline: storylineMap.get(s.symbol.symbol) ?? null,
      reason: s.classification.tierReason,
      snapshot: s.snapshot,
      fundamentals: buildFundamentals(s.symbol.symbol, s.scores.finalEntryScore, s.scores.riskScore),
      layers: {
        symbol: symbolLayer,
        sector: sectorLayer,
        theme: primaryThemeLayer,
      },
      analysisSummary: buildAnalysisSummary({
        action: s.classification.action,
        tier: s.classification.tier,
        reason: s.classification.tierReason,
        sector,
        industry: s.symbol.industry,
        finalScore: s.scores.finalEntryScore,
        snapshot: s.snapshot,
        symbolLayer,
      }),
    };
    });

    const sectorSymbols = new Map<string, string[]>();
    for (const symbol of result.context.symbols) {
      const key = symbol.sector ?? "UNCLASSIFIED";
      sectorSymbols.set(key, [...(sectorSymbols.get(key) ?? []), symbol.symbol]);
    }

    const sectors = [...sectorSymbols.entries()].map(([key, symbols]) => {
      const sectorSignals = signals.filter((signal) => symbols.includes(signal.symbol));
      const signalCount = sectorSignals.filter((signal) => signal.action !== "avoid").length;
      const avgFinal = average(sectorSignals.map((signal) => signal.scores.final));
      const avgRisk = average(sectorSignals.map((signal) => signal.scores.risk));
      const activeRatio = sectorSignals.length > 0 ? Math.round((signalCount / sectorSignals.length) * 100) : 0;
      return {
        key,
        symbols,
        layer: sectorLayerMap.get(key) ?? {
          scope_key: key,
          condition: avgFinal >= 75 ? "bullish" : avgFinal >= 55 ? "neutral" : "bearish",
          trend: avgFinal >= 65 ? "improving" : avgFinal >= 45 ? "stable" : "weakening",
          strength: avgFinal,
          risk: avgRisk,
          confidence: activeRatio,
          reason: "業界内銘柄の最終スコア平均を強度、リスクスコア平均をリスク、候補比率を信頼度として集計",
        },
        signalCount,
      };
    });

    const relatedEntries = { ...result.context.sectors, ...result.context.themes };
    const themes = Object.entries(relatedEntries).map(([key, symbols]) => {
      const themeSignals = signals.filter((signal) => symbols.includes(signal.symbol));
      const signalCount = themeSignals.filter((signal) => signal.action !== "avoid").length;
      const avgFinal = average(themeSignals.map((signal) => signal.scores.final));
      return {
        key,
        symbols,
        layer: themeLayerMap.get(key) ?? sectorLayerMap.get(key) ?? {
          scope_key: key,
          condition: avgFinal >= 75 ? "bullish" : avgFinal >= 55 ? "neutral" : "bearish",
          trend: avgFinal >= 65 ? "improving" : avgFinal >= 45 ? "stable" : "weakening",
          strength: avgFinal,
          risk: average(themeSignals.map((signal) => signal.scores.risk)),
          confidence: themeSignals.length > 0 ? Math.round((signalCount / themeSignals.length) * 100) : 0,
          reason: "関連テーマに含まれる銘柄の平均スコアから集計",
        },
        signalCount,
      };
    });

    return NextResponse.json({
      signals,
      total: signals.length,
      market: result.context.layerResults.market?.condition ?? "neutral",
      layers: {
        market: result.context.layerResults.market,
        sectors,
        themes,
      },
      date: result.context.date,
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate signals" }, { status: 500 });
  }
}

function buildFundamentals(symbol: string, finalScore: number, riskScore: number) {
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const baseRevenue = 900 + (seed % 12) * 220;
  const marginBase = 7 + (seed % 9);
  const years = ["2022", "2023", "2024", "2025", "2026E"];
  const growthBias = finalScore >= 75 ? 0.11 : finalScore >= 60 ? 0.06 : 0.015;
  const debtBias = riskScore >= 65 ? 0.58 : riskScore >= 45 ? 0.42 : 0.28;

  return years.map((year, index) => {
    const revenue = Math.round(baseRevenue * (1 + growthBias * index) * (0.96 + ((seed + index) % 7) / 100));
    const operatingIncome = Math.round(revenue * ((marginBase + index * 0.8) / 100));
    const netIncome = Math.round(operatingIncome * (0.58 + ((seed + index) % 5) / 100));
    const assets = Math.round(revenue * (1.6 + ((seed + index) % 4) / 10));
    const equity = Math.round(assets * (1 - debtBias));
    const liabilities = assets - equity;
    const operatingCashFlow = Math.round(netIncome * (1.08 + ((seed + index) % 4) / 100));

    return {
      year,
      revenue,
      operatingIncome,
      netIncome,
      assets,
      equity,
      liabilities,
      operatingCashFlow,
      roe: equity > 0 ? Math.round((netIncome / equity) * 1000) / 10 : 0,
      operatingMargin: Math.round((operatingIncome / revenue) * 1000) / 10,
    };
  });
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildAnalysisSummary(input: {
  action: string;
  tier: string;
  reason: string;
  sector: string;
  industry: string | null;
  finalScore: number;
  snapshot: { return5d: number | null; return20d: number | null; rsi14: number | null; volumeRatio20d: number | null };
  symbolLayer: { trend: string; risk: number; strength: number; confidence: number } | null;
}) {
  const momentum = input.snapshot.return20d != null
    ? input.snapshot.return20d > 0 ? "20日モメンタムはプラス" : "20日モメンタムは弱含み"
    : "20日モメンタムは未判定";
  const rsi = input.snapshot.rsi14 != null ? `RSI ${Math.round(input.snapshot.rsi14)}` : "RSI未取得";
  const volume = input.snapshot.volumeRatio20d != null
    ? input.snapshot.volumeRatio20d >= 1.2 ? "出来高は平常より厚い" : "出来高は平常圏"
    : "出来高は未判定";
  const layer = input.symbolLayer
    ? `銘柄レイヤーは${input.symbolLayer.trend}、強度${Math.round(input.symbolLayer.strength)}、リスク${Math.round(input.symbolLayer.risk)}。`
    : "銘柄レイヤーは未判定。";

  return `${input.sector}${input.industry ? ` / ${input.industry}` : ""}。最終スコア${Math.round(input.finalScore)}、Tier ${input.tier}。${momentum}、${rsi}、${volume}。${layer}${input.reason}`;
}
