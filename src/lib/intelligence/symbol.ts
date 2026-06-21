import type { ConditionLabel, TrendLabel, ImpactLabel, LayerCondition, SymbolSnapshot } from "./types";

export function evaluateSymbol(params: { symbol: string; snapshot: SymbolSnapshot | null; timeframe: "1D" | "1W"; capturedAt: string }): LayerCondition {
  const { symbol, snapshot: s, timeframe, capturedAt } = params;
  if (!s) return { layer_name: "symbol", scope_key: symbol, timeframe, captured_at: capturedAt, condition: "neutral", trend: "stable", strength: 50, risk: 50, confidence: 20, impact: "neutral", reason: "no snapshot", data_confidence: 0 };
  const reasonParts: string[] = [];
  let smaScore = 50;
  if (s.sma20 !== null && s.sma50 !== null && s.sma200 !== null) {
    if (s.close > s.sma20 && s.sma20 > s.sma50 && s.sma50 > s.sma200) { smaScore = 85; reasonParts.push("perfect MA alignment"); }
    else if (s.close > s.sma20 && s.sma20 > s.sma50) { smaScore = 75; reasonParts.push("above SMA20+50"); }
    else if (s.close < s.sma200) { smaScore = 20; reasonParts.push("below SMA200"); }
    else if (s.close < s.sma50) { smaScore = 35; reasonParts.push("below SMA50"); }
  } else if (s.sma20 !== null) { smaScore = s.close > s.sma20 ? 65 : 40; }
  let rsiScore = 50;
  if (s.rsi14 !== null) {
    if (s.rsi14 > 70) { rsiScore = 65; reasonParts.push(`RSI overbought ${s.rsi14.toFixed(0)}`); }
    else if (s.rsi14 > 55) { rsiScore = 65; reasonParts.push(`RSI bullish ${s.rsi14.toFixed(0)}`); }
    else if (s.rsi14 < 30) { rsiScore = 35; reasonParts.push(`RSI oversold ${s.rsi14.toFixed(0)}`); }
  }
  let volScore = 50;
  if (s.volumeRatio20d !== null) {
    if (s.volumeRatio20d > 2) { volScore = 75; reasonParts.push(`volume surge ${s.volumeRatio20d.toFixed(1)}x`); }
    else if (s.volumeRatio20d < 0.5) { volScore = 35; reasonParts.push("volume contraction"); }
  }
  let highScore = 50;
  if (s.distanceFrom52wHighPct !== null && s.distanceFrom52wHighPct > -2) { highScore = 70; reasonParts.push("near 52W high"); }
  let ddRisk = 50;
  if (s.drawdownFromRecentHighPct !== null && s.drawdownFromRecentHighPct < -15) ddRisk = 75;
  const strength = Math.round((smaScore + rsiScore + volScore + highScore) / 4);
  const rsiRisk = s.rsi14 !== null ? (s.rsi14 > 70 || s.rsi14 < 30 ? 65 : 40) : 50;
  const risk = Math.round((ddRisk + rsiRisk) / 2);
  const confidence = s.sma20 !== null && s.rsi14 !== null ? 80 : 50;
  let condition: ConditionLabel, impact: ImpactLabel, trend: TrendLabel;
  if (strength >= 72 && risk <= 40) { condition = "strong_bullish"; impact = "upgrade"; trend = "improving"; }
  else if (strength >= 60 && risk <= 55) { condition = "bullish"; impact = "upgrade"; trend = "improving"; }
  else if (strength <= 30 && risk >= 70) { condition = "strong_bearish"; impact = "downgrade"; trend = "weakening"; }
  else if (strength <= 40 && risk >= 60) { condition = "bearish"; impact = "downgrade"; trend = "weakening"; }
  else { condition = "neutral"; impact = "neutral"; trend = strength > 50 ? "improving" : strength < 50 ? "weakening" : "stable"; }
  return { layer_name: "symbol", scope_key: symbol, timeframe, captured_at: capturedAt, condition, trend, strength, risk, confidence, impact, reason: reasonParts.join("; "), data_confidence: s.sma20 !== null && s.rsi14 !== null ? 80 : Math.round(confidence) };
}
