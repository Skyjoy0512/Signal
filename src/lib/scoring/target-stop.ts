import type { SymbolSnapshot } from "../intelligence/types";
import type { TradeScenario } from "./types";

export function computeTradeScenario(params: {
  snapshot: SymbolSnapshot; atr20?: number | null; swingHigh?: number | null; swingLow?: number | null; high6m?: number | null;
}): TradeScenario {
  const { snapshot, atr20, swingHigh, swingLow, high6m } = params;
  const entryPrice = snapshot.close;
  const effectiveAtr = atr20 ?? snapshot.close * 0.02;
  const stopFromSwing = swingLow != null ? swingLow - 0.3 * effectiveAtr : null;
  const stopFromAtr = entryPrice - 1.5 * effectiveAtr;
  const stopPrice = stopFromSwing != null ? Math.max(stopFromSwing, stopFromAtr) : stopFromAtr;
  const targetConservative = Math.min(swingHigh ?? Infinity, entryPrice + 1.0 * effectiveAtr);
  const targetBase = entryPrice + 2.0 * effectiveAtr;
  const targetBull = Math.max(high6m ?? entryPrice + 3.5 * effectiveAtr, entryPrice + 3.5 * effectiveAtr);
  const downsidePct = ((stopPrice - entryPrice) / entryPrice) * 100;
  const upsideConservativePct = ((targetConservative - entryPrice) / entryPrice) * 100;
  const upsideBasePct = ((targetBase - entryPrice) / entryPrice) * 100;
  const upsideBullPct = ((targetBull - entryPrice) / entryPrice) * 100;
  const downside = entryPrice - stopPrice;
  const upsideBase = targetBase - entryPrice;
  const riskRewardBase = downside > 0 ? upsideBase / downside : 0;
  return {
    entryPrice, stopPrice, targetConservative, targetBase, targetBull,
    upsideConservativePct: r2(upsideConservativePct), upsideBasePct: r2(upsideBasePct), upsideBullPct: r2(upsideBullPct),
    downsidePct: r2(downsidePct), riskRewardBase: r2(riskRewardBase),
    expectedHoldingPeriod: "1-3M", calculationMethod: effectiveAtr === atr20 ? "atr_v1" : "atr_estimated",
  };
}
function r2(n: number): number { return Math.round(n * 100) / 100; }
