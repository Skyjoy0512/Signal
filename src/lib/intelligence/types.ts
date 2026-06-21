export type ConditionLabel = "strong_bullish" | "bullish" | "neutral" | "bearish" | "strong_bearish";
export type TrendLabel = "improving" | "stable" | "weakening";
export type ImpactLabel = "upgrade" | "neutral" | "downgrade" | "block";
export interface LayerCondition {
  layer_name: string; scope_key: string; timeframe: "1D" | "1W";
  captured_at: string; condition: ConditionLabel; trend: TrendLabel;
  strength: number; risk: number; confidence: number; impact: ImpactLabel;
  reason: string; data_confidence: number;
}
export interface SymbolSnapshot {
  symbol: string; close: number;
  sma20: number | null; sma50: number | null; sma200: number | null;
  rsi14: number | null; volumeRatio20d: number | null;
  return5d: number | null; return20d: number | null;
  distanceFrom52wHighPct: number | null; drawdownFromRecentHighPct: number | null;
}
export interface LayerContext {
  symbols: Record<string, SymbolSnapshot[]>;
  benchmarks?: Record<string, SymbolSnapshot[]>;
  sectors?: Record<string, string[]>;
  themes?: Record<string, string[]>;
}
