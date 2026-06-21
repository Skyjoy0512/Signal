import type { SymbolSnapshot } from "../intelligence/types";
import type { StrategyTag, TradeScenario } from "./types";

export function computeTradeScenario(params: {
  snapshot: SymbolSnapshot; atr20?: number | null; swingHigh?: number | null; swingLow?: number | null; high6m?: number | null; strategyTags?: StrategyTag[];
}): TradeScenario {
  const { snapshot, atr20, swingHigh, swingLow, high6m } = params;
  const strategy = choosePrimaryStrategy(params.strategyTags);
  const profile = strategyProfile(strategy);
  const entryPrice = snapshot.close;
  const effectiveAtr = atr20 ?? snapshot.close * 0.02;
  const stopFromSwing = swingLow != null ? swingLow - 0.3 * effectiveAtr : null;
  const stopFromSma = snapshot.sma20 != null && snapshot.sma20 < entryPrice ? snapshot.sma20 - 0.4 * effectiveAtr : null;
  const stopFromAtr = entryPrice - profile.stopAtr * effectiveAtr;
  const viableStops = [stopFromSwing, stopFromSma, stopFromAtr].filter((stop): stop is number => stop != null && stop > 0 && stop < entryPrice);
  const stopPrice = viableStops.length > 0 ? Math.max(...viableStops) : stopFromAtr;
  const swingTarget = swingHigh != null && swingHigh > entryPrice ? swingHigh : null;
  const targetConservative = Math.min(swingTarget ?? entryPrice + profile.conservativeTargetAtr * effectiveAtr, entryPrice + profile.conservativeTargetAtr * effectiveAtr);
  const targetBase = Math.max(swingTarget ?? 0, entryPrice + profile.baseTargetAtr * effectiveAtr);
  const targetBull = Math.max(high6m ?? entryPrice + profile.bullTargetAtr * effectiveAtr, entryPrice + profile.bullTargetAtr * effectiveAtr);
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
    expectedHoldingPeriod: profile.holdingPeriod, calculationMethod: `${effectiveAtr === atr20 ? "atr" : "atr_estimated"}_${strategy}_v2`,
  };
}
function r2(n: number): number { return Math.round(n * 100) / 100; }

function choosePrimaryStrategy(tags: StrategyTag[] | undefined): StrategyTag {
  if (!tags || tags.length === 0) return "trend_follow";
  if (tags.includes("breakout")) return "breakout";
  if (tags.includes("pullback")) return "pullback";
  if (tags.includes("reversal")) return "reversal";
  return "trend_follow";
}

function strategyProfile(strategy: StrategyTag): {
  stopAtr: number;
  conservativeTargetAtr: number;
  baseTargetAtr: number;
  bullTargetAtr: number;
  holdingPeriod: string;
} {
  switch (strategy) {
    case "breakout":
      return { stopAtr: 1.3, conservativeTargetAtr: 1.2, baseTargetAtr: 2.4, bullTargetAtr: 4.0, holdingPeriod: "2W-2M" };
    case "pullback":
      return { stopAtr: 1.5, conservativeTargetAtr: 1.0, baseTargetAtr: 2.0, bullTargetAtr: 3.2, holdingPeriod: "1-3M" };
    case "reversal":
      return { stopAtr: 1.8, conservativeTargetAtr: 1.0, baseTargetAtr: 2.2, bullTargetAtr: 3.6, holdingPeriod: "1-4M" };
    case "trend_follow":
      return { stopAtr: 1.6, conservativeTargetAtr: 1.2, baseTargetAtr: 2.6, bullTargetAtr: 4.2, holdingPeriod: "1-6M" };
  }
}
