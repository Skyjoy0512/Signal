import type { IndicatorInput, IndicatorOutput, DataConfidenceInput, DataConfidenceOutput } from "./types";

export function sma(bars: IndicatorInput[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += bars[j].close;
    result.push(sum / period);
  }
  return result;
}

export function rsi(bars: IndicatorInput[], period: number): (number | null)[] {
  const result: (number | null)[] = [null];
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (i < bars.length - 1) {
      const change = bars[i + 1].close - bars[i].close;
      if (change > 0) avgGain += change; else avgLoss += Math.abs(change);
    }
  }
  avgGain /= period; avgLoss /= period;
  for (let i = 1; i < period; i++) result.push(null);
  if (bars.length <= period) return result;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < bars.length; i++) {
    const change = bars[i].close - bars[i - 1].close;
    const gain = change > 0 ? change : 0, loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

function trueRange(curr: IndicatorInput, prevClose: number | null): number {
  if (prevClose === null) return curr.high - curr.low;
  return Math.max(curr.high - curr.low, Math.abs(curr.high - prevClose), Math.abs(curr.low - prevClose));
}

export function atr(bars: IndicatorInput[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const trs: number[] = [];
  for (let i = 0; i < bars.length; i++) trs.push(trueRange(bars[i], i > 0 ? bars[i - 1].close : null));
  for (let i = 0; i < period; i++) result.push(null);
  if (bars.length <= period) return result;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += trs[i];
  let atrVal = sum / period;
  result[period] = atrVal;
  for (let i = period + 1; i < bars.length; i++) { atrVal = (atrVal * (period - 1) + trs[i]) / period; result.push(atrVal); }
  return result;
}

export interface VolumeIndicators { avg20d: (number | null)[]; ratio20d: (number | null)[]; }

export function volumeIndicators(bars: IndicatorInput[], period: number = 20): VolumeIndicators {
  const avg20d: (number | null)[] = [], ratio20d: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { avg20d.push(null); ratio20d.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += bars[j].volume;
    const avg = sum / period;
    avg20d.push(avg);
    ratio20d.push(avg > 0 ? bars[i].volume / avg : null);
  }
  return { avg20d, ratio20d };
}

export interface HighLow52w { high: number | null; low: number | null; distanceFromHighPct: number | null; }

export function fiftyTwoWeekHighLow(bars: IndicatorInput[]): HighLow52w {
  if (bars.length === 0) return { high: null, low: null, distanceFromHighPct: null };
  const last = bars[bars.length - 1];
  let high = last.high, low = last.low;
  for (const bar of bars) { if (bar.high > high) high = bar.high; if (bar.low < low) low = bar.low; }
  const distanceFromHighPct = high > 0 ? ((last.close - high) / high) * 100 : null;
  return { high, low, distanceFromHighPct };
}

export function drawdownFromRecentHigh(bars: IndicatorInput[]): number | null {
  if (bars.length === 0) return null;
  let peak = bars[0].close, maxDrawdownPct = 0;
  for (const bar of bars) { if (bar.close > peak) peak = bar.close; const dd = ((bar.close - peak) / peak) * 100; if (dd < maxDrawdownPct) maxDrawdownPct = dd; }
  return maxDrawdownPct;
}

export function returnPeriod(bars: IndicatorInput[], lookback: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    const prevIdx = i - lookback;
    if (prevIdx < 0) result.push(null);
    else result.push(bars[prevIdx].close > 0 ? ((bars[i].close - bars[prevIdx].close) / bars[prevIdx].close) * 100 : null);
  }
  return result;
}

export interface ComputeIndicatorsOutput { indicators: IndicatorOutput[]; }

export function computeAllIndicators(bars: IndicatorInput[]): ComputeIndicatorsOutput {
  if (bars.length === 0) return { indicators: [] };
  const sma20 = sma(bars, 20), sma50 = sma(bars, 50), sma200 = sma(bars, 200);
  const rsi14 = rsi(bars, 14), atr14 = atr(bars, 14), atr20 = atr(bars, 20);
  const vol = volumeIndicators(bars, 20);
  const returns1d = returnPeriod(bars, 1), returns5d = returnPeriod(bars, 5);
  const returns20d = returnPeriod(bars, 20), returns60d = returnPeriod(bars, 60);
  const hl52w = fiftyTwoWeekHighLow(bars);
  const dd = drawdownFromRecentHigh(bars);
  const indicators: IndicatorOutput[] = [];
  for (let i = 0; i < bars.length; i++) {
    indicators.push({
      sma20: sma20[i], sma50: sma50[i], sma200: sma200[i], rsi14: rsi14[i],
      atr14: atr14[i], atr20: atr20[i], volume20dAvg: vol.avg20d[i], volumeRatio20d: vol.ratio20d[i],
      return1d: returns1d[i], return5d: returns5d[i], return20d: returns20d[i], return60d: returns60d[i],
      high52w: i === bars.length - 1 ? hl52w.high : null, low52w: i === bars.length - 1 ? hl52w.low : null,
      distanceFrom52wHighPct: i === bars.length - 1 ? hl52w.distanceFromHighPct : null,
      drawdownFromRecentHighPct: i === bars.length - 1 ? dd : null,
    });
  }
  return { indicators };
}

export function computeDataConfidence(input: DataConfidenceInput): DataConfidenceOutput {
  const { bars, expectedBars, maxAgeHours, now = new Date() } = input;
  const reason: string[] = [];
  if (bars.length === 0) return { score: 0, reason: ["no data"] };
  const completenessRatio = Math.min(bars.length / expectedBars, 1);
  const completenessScore = Math.round(completenessRatio * 25);
  if (completenessRatio < 0.7) reason.push(`low completeness: ${bars.length}/${expectedBars} bars`);
  const lastBar = bars[bars.length - 1];
  const lastDate = new Date(lastBar.date);
  const ageHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
  let freshnessScore: number;
  if (ageHours <= maxAgeHours) freshnessScore = 45;
  else if (ageHours <= maxAgeHours * 2) freshnessScore = 25;
  else if (ageHours <= maxAgeHours * 4) freshnessScore = 10;
  else if (ageHours <= maxAgeHours * 8) freshnessScore = 3;
  else { freshnessScore = 0; reason.push(`stale data: ${ageHours.toFixed(0)}h old`); }
  let nullCount = 0, totalFields = 0;
  for (const bar of bars) {
    const fields = [bar.open, bar.high, bar.low, bar.close, bar.volume];
    totalFields += fields.length;
    for (const f of fields) { if (f === null || f === undefined || isNaN(f)) nullCount++; }
  }
  const nullRatio = totalFields > 0 ? 1 - nullCount / totalFields : 0;
  const nullScore = Math.round(nullRatio * 30);
  if (nullRatio < 0.8) reason.push(`high null fields`);
  const score = Math.min(completenessScore + freshnessScore + nullScore, 100);
  return { score, reason: reason.length > 0 ? reason : ["data looks good"] };
}
