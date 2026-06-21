import type { ConditionLabel, TrendLabel, ImpactLabel, LayerCondition, SymbolSnapshot } from "./types";

export function evaluateMarketRegime(params: { benchmark: SymbolSnapshot[]; timeframe: "1D" | "1W"; capturedAt: string }): LayerCondition {
  const { benchmark, timeframe, capturedAt } = params;
  if (benchmark.length === 0) {
    return { layer_name: "market", scope_key: "JP_MARKET", timeframe, captured_at: capturedAt, condition: "neutral", trend: "stable", strength: 50, risk: 50, confidence: 30, impact: "neutral", reason: "no benchmark data", data_confidence: 0 };
  }
  const latest = benchmark[benchmark.length - 1];
  let smaScore = 50;
  const reasonParts: string[] = [];
  if (latest.sma20 !== null && latest.sma50 !== null) {
    if (latest.close > latest.sma20 && latest.sma20 > latest.sma50) { smaScore = 80; reasonParts.push("price above SMA20 and SMA50"); }
    else if (latest.close > latest.sma20) { smaScore = 65; reasonParts.push("price above SMA20"); }
    else if (latest.close > latest.sma50) { smaScore = 55; reasonParts.push("price above SMA50"); }
    else if (latest.close < latest.sma20 && latest.close < latest.sma50) { smaScore = 30; reasonParts.push("price below both MAs"); }
    else { smaScore = 40; reasonParts.push("mixed vs MAs"); }
  }
  let trendDirection = 0, trendConf = 50;
  if (latest.return5d !== null && latest.return20d !== null) {
    if (latest.return5d > 2 && latest.return20d > 5) { trendDirection = 3; trendConf = 80; reasonParts.push("strong uptrend"); }
    else if (latest.return5d > 0 && latest.return20d > 0) { trendDirection = 2; trendConf = 70; reasonParts.push("uptrend"); }
    else if (latest.return5d < -2 && latest.return20d < -5) { trendDirection = -3; trendConf = 80; reasonParts.push("strong downtrend"); }
    else if (latest.return5d < 0 && latest.return20d < 0) { trendDirection = -2; trendConf = 70; reasonParts.push("downtrend"); }
    else { trendDirection = 0; trendConf = 50; reasonParts.push("mixed direction"); }
  }
  let rsiRisk = 50;
  if (latest.rsi14 !== null) {
    if (latest.rsi14 > 75) { rsiRisk = 70; reasonParts.push(`RSI overbought (${latest.rsi14.toFixed(0)})`); }
    else if (latest.rsi14 < 25) { rsiRisk = 70; reasonParts.push(`RSI oversold (${latest.rsi14.toFixed(0)})`); }
    else if (latest.rsi14 > 60) rsiRisk = 55;
    else if (latest.rsi14 < 40) rsiRisk = 60;
    else { rsiRisk = 45; reasonParts.push("RSI neutral"); }
  }
  let riskFromHigh = 50;
  if (latest.distanceFrom52wHighPct !== null) {
    if (latest.distanceFrom52wHighPct > -2) { riskFromHigh = 35; reasonParts.push("near 52W high"); }
    else if (latest.distanceFrom52wHighPct < -15) { riskFromHigh = 75; reasonParts.push("far below 52W high"); }
  }
  const strength = Math.round((smaScore + trendConf) / 2);
  const risk = Math.round((rsiRisk + riskFromHigh) / 2);
  const confidence = Math.round((50 + trendConf) / 2);
  let condition: ConditionLabel, impact: ImpactLabel, trend: TrendLabel;
  if (trendDirection >= 3 && strength >= 75) { condition = "strong_bullish"; impact = "upgrade"; trend = "improving"; }
  else if (trendDirection >= 2 && strength >= 60) { condition = "bullish"; impact = "upgrade"; trend = "improving"; }
  else if (trendDirection <= -3) { condition = "strong_bearish"; impact = "downgrade"; trend = "weakening"; }
  else if (trendDirection <= -2) { condition = "bearish"; impact = "downgrade"; trend = "weakening"; }
  else { condition = "neutral"; impact = "neutral"; trend = trendDirection > 0 ? "improving" : trendDirection < 0 ? "weakening" : "stable"; }
  return { layer_name: "market", scope_key: "JP_MARKET", timeframe, captured_at: capturedAt, condition, trend, strength, risk, confidence, impact, reason: reasonParts.join("; ") || "evaluated", data_confidence: latest.sma20 !== null && latest.rsi14 !== null ? 80 : 50 };
}
