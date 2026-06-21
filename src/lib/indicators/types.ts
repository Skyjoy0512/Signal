export interface IndicatorInput {
  date: string; open: number; high: number; low: number; close: number; volume: number;
}
export interface IndicatorOutput {
  sma20: number | null; sma50: number | null; sma200: number | null;
  rsi14: number | null; atr14: number | null; atr20: number | null;
  volume20dAvg: number | null; volumeRatio20d: number | null;
  return1d: number | null; return5d: number | null; return20d: number | null; return60d: number | null;
  high52w: number | null; low52w: number | null;
  distanceFrom52wHighPct: number | null; drawdownFromRecentHighPct: number | null;
}
export interface DataConfidenceInput {
  bars: IndicatorInput[]; expectedBars: number; maxAgeHours: number; now?: Date;
}
export interface DataConfidenceOutput { score: number; reason: string[]; }
