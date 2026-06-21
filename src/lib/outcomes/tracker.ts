import type { OutcomeInput, OutcomeResult, OutcomeHorizon } from "./types";

export function evaluateOutcome(input: OutcomeInput): OutcomeResult {
  const { priceAtSignal, priceAtReview, maxFavorableExcursion, maxAdverseExcursion, benchmarkReturnPct } = input;

  const returnPct = priceAtSignal > 0
    ? ((priceAtReview - priceAtSignal) / priceAtSignal) * 100
    : 0;

  const excessReturnPct = benchmarkReturnPct != null
    ? Math.round((returnPct - benchmarkReturnPct) * 100) / 100
    : null;

  const mfe = maxFavorableExcursion != null
    ? ((maxFavorableExcursion - priceAtSignal) / priceAtSignal) * 100
    : null;

  const mae = maxAdverseExcursion != null
    ? ((maxAdverseExcursion - priceAtSignal) / priceAtSignal) * 100
    : null;

  let resultLabel = "neutral";
  if (returnPct > 5) resultLabel = "strong_win";
  else if (returnPct > 0) resultLabel = "win";
  else if (returnPct > -2) resultLabel = "flat";
  else if (returnPct > -5) resultLabel = "loss";
  else resultLabel = "large_loss";

  return {
    returnPct: Math.round(returnPct * 100) / 100,
    excessReturnPct,
    mfe: mfe != null ? Math.round(mfe * 100) / 100 : null,
    mae: mae != null ? Math.round(mae * 100) / 100 : null,
    resultLabel,
    benchmarkReturnPct: benchmarkReturnPct ?? null,
  };
}

export function getReviewDate(openedAt: string, horizon: OutcomeHorizon): string {
  const d = new Date(openedAt);
  switch (horizon) {
    case "1W": d.setDate(d.getDate() + 7); break;
    case "1M": d.setMonth(d.getMonth() + 1); break;
    case "3M": d.setMonth(d.getMonth() + 3); break;
  }
  return d.toISOString().split("T")[0];
}

export function detectDueReviews(openedAt: string, now: Date = new Date()): OutcomeHorizon[] {
  const due: OutcomeHorizon[] = [];
  const openDate = new Date(openedAt);
  const diffDays = (now.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays >= 210) due.push("3M"); // ~7 months catch-up
  if (diffDays >= 60) due.push("1M");
  if (diffDays >= 12) due.push("1W");

  return due;
}
