export type OutcomeHorizon = "1W" | "1M" | "3M";

export interface OutcomeInput {
  signalId?: string | null;
  positionId?: string | null;
  paperTradeId?: string | null;
  horizon: OutcomeHorizon;
  priceAtSignal: number;
  priceAtReview: number;
  maxFavorableExcursion?: number | null;
  maxAdverseExcursion?: number | null;
  benchmarkSymbol?: string | null;
  benchmarkReturnPct?: number | null;
  reviewedAt: string;
}

export interface OutcomeResult {
  returnPct: number;
  excessReturnPct: number | null;
  mfe: number | null;
  mae: number | null;
  resultLabel: string;
  benchmarkReturnPct: number | null;
}
