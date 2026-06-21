import type { PaperTradeInput } from "./types";
import type { SignalAction } from "../supabase/types";
import type { ScoredSymbol } from "../jobs/types";

/**
 * Paper Trade Engine - auto-creates paper trades from signals.
 */
export function createPaperTradeFromSignal(
  scored: ScoredSymbol,
  signalId: string,
): PaperTradeInput {
  const { classification, scores, snapshot } = scored;

  return {
    signalId,
    symbolId: scored.symbol.id,
    entryPrice: classification.scenario?.entryPrice ?? snapshot.close,
    stopPrice: classification.scenario?.stopPrice ?? null,
    targetBase: classification.scenario?.targetBase ?? null,
    actionSuggestion: classification.action as SignalAction,
    strategyTags: scores.strategyTags,
  };
}

export function createPaperTrade(input: PaperTradeInput): PaperTradeInput & {
  createdAt: string;
} {
  return {
    ...input,
    createdAt: new Date().toISOString(),
  };
}
