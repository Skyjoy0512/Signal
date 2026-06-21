import type { ConditionLabel, TrendLabel, ImpactLabel, LayerCondition, SymbolSnapshot } from "./types";

export function evaluateSector(params: { sectorName: string; symbols: SymbolSnapshot[]; timeframe: "1D" | "1W"; capturedAt: string }): LayerCondition {
  const { sectorName, symbols, timeframe, capturedAt } = params;
  if (symbols.length === 0) return { layer_name: "sector", scope_key: sectorName, timeframe, captured_at: capturedAt, condition: "neutral", trend: "stable", strength: 50, risk: 50, confidence: 30, impact: "neutral", reason: "no data", data_confidence: 0 };
  let bullishCount = 0, bearishCount = 0, totalReturn20d = 0, totalVolumeRatio = 0, avgRsi = 0, rsiCount = 0, validCount = 0;
  for (const s of symbols) {
    let symBullish = false, symBearish = false;
    if (s.sma20 !== null && s.close > s.sma20) symBullish = true;
    if (s.sma20 !== null && s.close < s.sma20) symBearish = true;
    if (s.return20d !== null && s.return20d > 3) symBullish = true;
    if (s.return20d !== null && s.return20d < -3) symBearish = true;
    if (symBullish && !symBearish) bullishCount++;
    else if (symBearish && !symBullish) bearishCount++;
    if (s.return20d !== null) { totalReturn20d += s.return20d; validCount++; }
    if (s.volumeRatio20d !== null) totalVolumeRatio += s.volumeRatio20d;
    if (s.rsi14 !== null) { avgRsi += s.rsi14; rsiCount++; }
  }
  const total = symbols.length;
  const avgReturn20d = validCount > 0 ? totalReturn20d / validCount : 0;
  const avgVolumeRatio = total > 0 ? totalVolumeRatio / total : 1;
  const meanRsi = rsiCount > 0 ? avgRsi / rsiCount : 50;
  const ratio = total > 0 ? bullishCount / total : 0;
  const bearishRatio = total > 0 ? bearishCount / total : 0;
  const strength = Math.round(50 + (ratio - bearishRatio) * 50);
  let risk = 50;
  if (avgVolumeRatio > 1.5) risk -= 10;
  if (avgVolumeRatio < 0.7) risk += 15;
  if (meanRsi > 70) risk += 15;
  if (meanRsi < 30) risk += 15;
  risk = Math.max(10, Math.min(90, risk));
  let condition: ConditionLabel, impact: ImpactLabel, trend: TrendLabel;
  if (ratio >= 0.7) { condition = "strong_bullish"; impact = "upgrade"; trend = "improving"; }
  else if (ratio >= 0.5) { condition = "bullish"; impact = "upgrade"; trend = "improving"; }
  else if (bearishRatio >= 0.7) { condition = "strong_bearish"; impact = "downgrade"; trend = "weakening"; }
  else if (bearishRatio >= 0.5) { condition = "bearish"; impact = "downgrade"; trend = "weakening"; }
  else { condition = "neutral"; impact = "neutral"; trend = avgReturn20d > 0 ? "improving" : avgReturn20d < 0 ? "weakening" : "stable"; }
  return { layer_name: "sector", scope_key: sectorName, timeframe, captured_at: capturedAt, condition, trend, strength, risk, confidence: Math.min(80, Math.round(30 + validCount / total * 50)), impact, reason: `bullish=${bullishCount} bearish=${bearishCount} avgRet=${avgReturn20d.toFixed(1)}%`, data_confidence: validCount > 0 ? Math.round(50 + validCount / total * 50) : 30 };
}
