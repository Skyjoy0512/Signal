import { EMA, MACD, RSI } from "trading-signals";

export interface AdvancedIndicatorInput {
  close: number;
}

export interface AdvancedSignalFeatures {
  rsiSignal: string;
  macdSignal: string;
  emaTrend: "bullish" | "bearish" | "neutral";
  qualityScore: number;
  reasons: string[];
}

export function computeAdvancedSignalFeatures(input: AdvancedIndicatorInput[]): AdvancedSignalFeatures {
  const rsi = new RSI(14);
  const ema20 = new EMA(20);
  const ema50 = new EMA(50);
  const macd = new MACD(new EMA(12), new EMA(26), new EMA(9));

  let lastEma20: number | null = null;
  let lastEma50: number | null = null;

  for (const point of input) {
    lastEma20 = ema20.update(point.close, false) ?? lastEma20;
    lastEma50 = ema50.update(point.close, false) ?? lastEma50;
    rsi.update(point.close, false);
    macd.update(point.close, false);
  }

  const rsiSignal = rsi.getSignal().state;
  const macdSignal = macd.getSignal().state;
  const emaTrend = lastEma20 == null || lastEma50 == null
    ? "neutral"
    : lastEma20 > lastEma50 ? "bullish" : lastEma20 < lastEma50 ? "bearish" : "neutral";

  const reasons: string[] = [];
  let qualityScore = 50;
  if (String(rsiSignal) === "BULLISH") { qualityScore += 12; reasons.push("RSIが強気"); }
  if (String(rsiSignal) === "BEARISH") { qualityScore -= 12; reasons.push("RSIが弱気"); }
  if (String(macdSignal) === "BULLISH") { qualityScore += 14; reasons.push("MACDが強気"); }
  if (String(macdSignal) === "BEARISH") { qualityScore -= 14; reasons.push("MACDが弱気"); }
  if (emaTrend === "bullish") { qualityScore += 10; reasons.push("短期EMAが中期EMAを上回る"); }
  if (emaTrend === "bearish") { qualityScore -= 10; reasons.push("短期EMAが中期EMAを下回る"); }

  return {
    rsiSignal: String(rsiSignal),
    macdSignal: String(macdSignal),
    emaTrend,
    qualityScore: Math.max(0, Math.min(100, qualityScore)),
    reasons: reasons.length > 0 ? reasons : ["追加テクニカルは中立"],
  };
}
