import type { Symbol } from "../supabase/types";
import type { LayerCondition, SymbolSnapshot } from "../intelligence/types";
import type { ScoringOutput, SignalClassification } from "../scoring/types";

export type JobStatus = "running" | "completed" | "failed";

export interface DailyScanContext {
  date: string;
  symbols: Symbol[];
  snapshots: Record<string, SymbolSnapshot>;
  benchmarkSnapshots: Record<string, SymbolSnapshot[]>;
  sectors: Record<string, string[]>;
  themes: Record<string, string[]>;
  layerResults: {
    market: LayerCondition | null;
    sectors: LayerCondition[];
    themes: LayerCondition[];
    symbols: LayerCondition[];
  };
  dataConfidence: Record<string, number>;
}

export interface ScoredSymbol {
  symbol: Symbol;
  snapshot: SymbolSnapshot;
  layer: LayerCondition;
  scores: ScoringOutput;
  classification: SignalClassification;
}

export interface DailyScanResult {
  context: DailyScanContext;
  scoredSymbols: ScoredSymbol[];
  strongSignals: ScoredSymbol[];
  entryCandidates: ScoredSymbol[];
  watchList: ScoredSymbol[];
  avoided: ScoredSymbol[];
  totalCostUsd: number;
  errors: string[];
  startedAt: string;
  finishedAt: string;
}

export interface SystemHealthEntry {
  jobType: string;
  status: string;
  errorMessage?: string;
  metrics?: Record<string, unknown>;
  startedAt?: string;
  finishedAt?: string;
}
