import type { ScoringInput, ScoringOutput, ScoreBreakdown, StrategyTag, StrategyFitScores } from "./types";

function clamp(v: number): number { return Math.max(0, Math.min(100, Math.round(v))); }

function computeOpportunityScore(input: ScoringInput): { score: number; breakdown: ScoreBreakdown["opportunity"] } {
  const { snapshot, symbol: symCond, sector: secCond } = input;
  let trendVal = 50;
  if (snapshot.sma20 !== null && snapshot.sma50 !== null) {
    if (snapshot.close > snapshot.sma20 && snapshot.sma20 > snapshot.sma50) trendVal = 85;
    else if (snapshot.close > snapshot.sma20) trendVal = 70;
    else if (snapshot.close > snapshot.sma50) trendVal = 55;
    else trendVal = 30;
  }
  if (snapshot.return20d !== null && snapshot.return20d > 5) trendVal = Math.max(trendVal, 75);
  else if (snapshot.return20d !== null && snapshot.return20d < -5) trendVal = Math.min(trendVal, 40);
  let volumeVal = 50;
  if (snapshot.volumeRatio20d !== null) {
    if (snapshot.volumeRatio20d > 2.0) volumeVal = 85; else if (snapshot.volumeRatio20d > 1.5) volumeVal = 75;
    else if (snapshot.volumeRatio20d > 1.2) volumeVal = 65; else if (snapshot.volumeRatio20d > 0.8) volumeVal = 50;
    else if (snapshot.volumeRatio20d > 0.5) volumeVal = 35; else volumeVal = 25;
  }
  let relStrength = 50;
  if (snapshot.distanceFrom52wHighPct !== null) {
    if (snapshot.distanceFrom52wHighPct > -2) relStrength = 85; else if (snapshot.distanceFrom52wHighPct > -5) relStrength = 75;
    else if (snapshot.distanceFrom52wHighPct > -10) relStrength = 60; else relStrength = 30;
  }
  let themeAlignment = 50;
  if (symCond && secCond) {
    if (secCond.impact === "upgrade") themeAlignment = symCond.strength >= 70 ? 85 : 65;
    else if (secCond.impact === "neutral") themeAlignment = 55;
    else themeAlignment = 40;
  }
  let fundamentalVal = 50;
  const f = input.fundamentals;
  if (f) {
    let fScore = 0, fCount = 0;
    if (f.roe != null) { fScore += f.roe > 15 ? 70 : f.roe > 8 ? 55 : 40; fCount++; }
    if (f.operatingMargin != null) { fScore += f.operatingMargin > 15 ? 70 : f.operatingMargin > 8 ? 55 : 40; fCount++; }
    if (f.revenueGrowth != null) { fScore += f.revenueGrowth > 10 ? 75 : f.revenueGrowth > 3 ? 60 : 45; fCount++; }
    if (fCount > 0) fundamentalVal = Math.round(fScore / fCount);
  }
  const catalystVal = 50;
  const score = Math.round(trendVal * 0.25 + volumeVal * 0.20 + relStrength * 0.15 + themeAlignment * 0.15 + fundamentalVal * 0.15 + catalystVal * 0.10);
  return { score: clamp(score), breakdown: { trend: trendVal, volume: volumeVal, relativeStrength: relStrength, theme: themeAlignment, fundamental: fundamentalVal, catalyst: catalystVal } };
}

function computeEntryTimingScore(input: ScoringInput): { score: number; breakdown: ScoreBreakdown["entryTiming"] } {
  const { snapshot } = input;
  let setup = 50, setupSignals = 0;
  if (snapshot.sma20 !== null && snapshot.close > snapshot.sma20) { setup += 15; setupSignals++; }
  if (snapshot.return5d !== null && snapshot.return5d > 0 && snapshot.return5d < 5) { setup += 10; setupSignals++; }
  if (snapshot.drawdownFromRecentHighPct !== null && snapshot.drawdownFromRecentHighPct > -5) { setup += 10; setupSignals++; }
  if (snapshot.volumeRatio20d !== null && snapshot.volumeRatio20d > 1.0) { setup += 10; setupSignals++; }
  if (setupSignals > 0) setup = Math.min(setup, 90);

  let rsiPosition = 50;
  if (snapshot.rsi14 !== null) {
    if (snapshot.rsi14 >= 50 && snapshot.rsi14 <= 65) rsiPosition = 80;
    else if (snapshot.rsi14 > 65 && snapshot.rsi14 <= 75) rsiPosition = 65;
    else if (snapshot.rsi14 > 40 && snapshot.rsi14 < 50) rsiPosition = 60;
    else if (snapshot.rsi14 > 75) rsiPosition = 35;
    else if (snapshot.rsi14 < 30) rsiPosition = 40;
    else rsiPosition = 45;
  }

  // ATR position: prefer tight consolidation (low recent volatility)
  let atrPosition = 50;
  if (snapshot.return5d !== null) {
    const abs5d = Math.abs(snapshot.return5d);
    if (abs5d < 2) atrPosition = 65;
    else if (abs5d < 5) atrPosition = 55;
    else atrPosition = 40;
  }

  // Support/resistance: distance to SMA20
  let supportResistance = 50;
  if (snapshot.sma20 !== null && snapshot.close > 0) {
    const distToSMA20 = ((snapshot.close - snapshot.sma20) / snapshot.close) * 100;
    if (distToSMA20 > 0 && distToSMA20 < 3) supportResistance = 75;
    else if (distToSMA20 > 0 && distToSMA20 < 5) supportResistance = 65;
    else if (distToSMA20 < 0 && distToSMA20 > -3) supportResistance = 55;
    else supportResistance = 40;
  }

  // Price action: 1d/5d direction alignment
  let priceAction = 50;
  if (snapshot.return5d !== null) {
    if (snapshot.return5d > 2) priceAction = 70;
    else if (snapshot.return5d > 0) priceAction = 60;
    else if (snapshot.return5d > -2) priceAction = 50;
    else priceAction = 40;
  }

  const score = Math.round(setup * 0.30 + rsiPosition * 0.15 + atrPosition * 0.15 + supportResistance * 0.20 + priceAction * 0.20);
  return { score: clamp(score), breakdown: { setup, rsiPosition, atrPosition, supportResistance, priceAction } };
}

function computeRiskScore(input: ScoringInput): { score: number; breakdown: ScoreBreakdown["risk"] } {
  const { snapshot, market: marketCond, sector: sectorCond, dataConfidence } = input;

  let volatilityVal = 50;
  if (snapshot.return5d !== null) {
    const abs5d = Math.abs(snapshot.return5d);
    if (abs5d > 10) volatilityVal = 85; else if (abs5d > 7) volatilityVal = 75;
    else if (abs5d > 5) volatilityVal = 60; else if (abs5d > 3) volatilityVal = 50; else volatilityVal = 40;
  }
  if (snapshot.drawdownFromRecentHighPct !== null && snapshot.drawdownFromRecentHighPct < -10) {
    volatilityVal = Math.max(volatilityVal, 70);
  }

  // Liquidity risk from volume ratio
  let liquidityVal = 50;
  if (snapshot.volumeRatio20d !== null) {
    if (snapshot.volumeRatio20d < 0.3) liquidityVal = 80;
    else if (snapshot.volumeRatio20d < 0.5) liquidityVal = 65;
    else if (snapshot.volumeRatio20d < 0.8) liquidityVal = 55;
    else liquidityVal = 35;
  }

  let eventVal = input.eventBlockerActive ? 90 : 50;
  const f = input.fundamentals;
  if (f?.pe != null && f.pe > 100) eventVal = Math.max(eventVal, 70);

  let marketRisk = 50;
  if (marketCond) {
    if (marketCond.condition === "strong_bearish") marketRisk = 85; else if (marketCond.condition === "bearish") marketRisk = 75;
    else if (marketCond.condition === "strong_bullish") marketRisk = 30; else if (marketCond.condition === "bullish") marketRisk = 40;
  }
  let sectorRiskVal = 50;
  if (sectorCond) {
    if (sectorCond.condition === "strong_bearish") sectorRiskVal = 80; else if (sectorCond.condition === "bearish") sectorRiskVal = 70;
    else if (sectorCond.condition === "strong_bullish") sectorRiskVal = 35; else if (sectorCond.condition === "bullish") sectorRiskVal = 40;
  }
  let dataRisk = 50;
  if (dataConfidence < 40) dataRisk = 90; else if (dataConfidence < 60) dataRisk = 75; else if (dataConfidence < 80) dataRisk = 55; else dataRisk = 30;

  const score = Math.round(volatilityVal * 0.25 + liquidityVal * 0.20 + eventVal * 0.20 + marketRisk * 0.15 + sectorRiskVal * 0.10 + dataRisk * 0.10);
  return { score: clamp(score), breakdown: { volatility: volatilityVal, liquidity: liquidityVal, event: eventVal, market: marketRisk, sector: sectorRiskVal, data: dataRisk } };
}

function computeConvictionScore(input: ScoringInput): { score: number; breakdown: ScoreBreakdown["conviction"] } {
  const { dataConfidence, market, sector, theme, symbol, snapshot } = input;
  const dataConf = Math.min(dataConfidence, 100);

  let alignCount = 0;
  for (const lc of [symbol, sector, theme, market]) {
    if (lc && (lc.condition === "strong_bullish" || lc.condition === "bullish")) alignCount++;
  }
  let multiLayerAlignment = alignCount >= 4 ? 95 : alignCount >= 3 ? 80 : alignCount >= 2 ? 65 : alignCount >= 1 ? 50 : 30;

  let techSignals = 0;
  if (snapshot.sma20 !== null && snapshot.close > snapshot.sma20) techSignals++;
  if (snapshot.sma50 !== null && snapshot.close > snapshot.sma50) techSignals++;
  if (snapshot.rsi14 !== null && snapshot.rsi14 >= 45 && snapshot.rsi14 <= 65) techSignals++;
  if (snapshot.volumeRatio20d !== null && snapshot.volumeRatio20d > 1.0) techSignals++;
  if (snapshot.return20d !== null && snapshot.return20d > 0) techSignals++;
  let techConf = 30 + techSignals * 12;

  // Fundamental confirmation
  let fundConf = 50;
  const f = input.fundamentals;
  if (f) {
    let fCount = 0;
    if (f.roe != null && f.roe > 8) fCount++;
    if (f.operatingMargin != null && f.operatingMargin > 8) fCount++;
    if (f.revenueGrowth != null && f.revenueGrowth > 0) fCount++;
    if (f.epsGrowth != null && f.epsGrowth > 0) fCount++;
    fundConf = 30 + fCount * 15;
  }

  // LLM confidence placeholder — updated after LLM pass
  const llmConf = 50;

  const score = Math.round(dataConf * 0.25 + multiLayerAlignment * 0.25 + techConf * 0.20 + fundConf * 0.15 + llmConf * 0.15);
  return { score: clamp(score), breakdown: { dataConfidence: dataConf, multiLayerAlignment, technicalConfirmation: techConf, fundamentalConfirmation: fundConf, llmConfidence: llmConf } };
}

function computeStrategyFitScores(input: ScoringInput): StrategyFitScores {
  const { snapshot } = input;
  let breakout = 50;
  if (snapshot.distanceFrom52wHighPct !== null && snapshot.distanceFrom52wHighPct > -3) breakout += 20;
  if (snapshot.volumeRatio20d !== null && snapshot.volumeRatio20d > 1.5) breakout += 15;
  if (snapshot.sma20 !== null && snapshot.close > snapshot.sma20) breakout += 10;
  if (snapshot.rsi14 !== null && snapshot.rsi14 > 60 && snapshot.rsi14 < 75) breakout += 10;
  if (snapshot.rsi14 !== null && snapshot.rsi14 > 75) breakout -= 15;
  if (input.eventBlockerActive) breakout -= 20;
  breakout = clamp(breakout);
  let pullback = 50;
  if (snapshot.sma20 !== null && snapshot.sma50 !== null && snapshot.close < snapshot.sma20 && snapshot.close > snapshot.sma50) pullback += 15;
  if (snapshot.return20d !== null && snapshot.return20d > 0) pullback += 15;
  if (snapshot.volumeRatio20d !== null && snapshot.volumeRatio20d < 0.8) pullback += 10;
  if (snapshot.rsi14 !== null && snapshot.rsi14 > 35 && snapshot.rsi14 < 50) pullback += 10;
  if (snapshot.drawdownFromRecentHighPct !== null && snapshot.drawdownFromRecentHighPct > -8 && snapshot.drawdownFromRecentHighPct < -2) pullback += 10;
  pullback = clamp(pullback);
  let reversal = 50;
  if (snapshot.rsi14 !== null && snapshot.rsi14 < 35) reversal += 15;
  if (snapshot.volumeRatio20d !== null && snapshot.volumeRatio20d > 1.5) reversal += 15;
  if (snapshot.return20d !== null && snapshot.return20d < -10) reversal += 10;
  if (snapshot.sma50 !== null && snapshot.close > snapshot.sma50) reversal += 10;
  reversal = clamp(reversal);
  let trendFollow = 50;
  if (snapshot.return5d !== null && snapshot.return20d !== null && snapshot.return5d > 0 && snapshot.return20d > 0) trendFollow += 20;
  if (snapshot.sma20 !== null && snapshot.sma50 !== null && snapshot.sma20 > snapshot.sma50) trendFollow += 15;
  if (snapshot.volumeRatio20d !== null && snapshot.volumeRatio20d > 0.8 && snapshot.volumeRatio20d < 2.0) trendFollow += 10;
  if (snapshot.rsi14 !== null && snapshot.rsi14 > 50 && snapshot.rsi14 < 70) trendFollow += 10;
  trendFollow = clamp(trendFollow);
  return { breakout, pullback, reversal, trend_follow: trendFollow };
}

function computeFinalEntryScore(symbolScore: number, input: ScoringInput): number {
  const { market: marketCond, sector: sectorCond } = input;
  let marketAdjustment = 0;
  if (marketCond) {
    if (marketCond.condition === "strong_bullish") marketAdjustment = 10;
    else if (marketCond.condition === "bullish") marketAdjustment = 5;
    else if (marketCond.condition === "bearish") marketAdjustment = -10;
    else if (marketCond.condition === "strong_bearish") marketAdjustment = -20;
  }
  let sectorAdjustment = 0;
  if (sectorCond) {
    if (sectorCond.condition === "strong_bullish") sectorAdjustment = 8;
    else if (sectorCond.condition === "bullish") sectorAdjustment = 4;
    else if (sectorCond.condition === "bearish") sectorAdjustment = -6;
    else if (sectorCond.condition === "strong_bearish") sectorAdjustment = -12;
  }
  return clamp(symbolScore * 0.50 + (50 + marketAdjustment * 0.15 + sectorAdjustment * 0.10));
}

export function computeAllScores(input: ScoringInput): ScoringOutput {
  const opp = computeOpportunityScore(input);
  const et = computeEntryTimingScore(input);
  const risk = computeRiskScore(input);
  const conv = computeConvictionScore(input);
  const strategyFitScores = computeStrategyFitScores(input);
  const strategyTags: StrategyTag[] = [];
  if (strategyFitScores.breakout >= 65) strategyTags.push("breakout");
  if (strategyFitScores.pullback >= 60) strategyTags.push("pullback");
  if (strategyFitScores.reversal >= 60) strategyTags.push("reversal");
  if (strategyFitScores.trend_follow >= 60) strategyTags.push("trend_follow");
  if (strategyTags.length === 0) {
    const entries = Object.entries(strategyFitScores) as [StrategyTag, number][];
    entries.sort((a, b) => b[1] - a[1]);
    strategyTags.push(entries[0][0]);
  }
  const symbolScore = Math.round(opp.score * 0.35 + et.score * 0.25 + (100 - risk.score) * 0.20 + conv.score * 0.20);
  const finalEntryScore = computeFinalEntryScore(symbolScore, input);
  return {
    opportunityScore: opp.score, entryTimingScore: et.score, riskScore: risk.score, convictionScore: conv.score,
    finalEntryScore, strategyFitScores, strategyTags,
    breakdown: { opportunity: opp.breakdown, entryTiming: et.breakdown, risk: risk.breakdown, conviction: conv.breakdown },
  };
}

import type { LlmScoreAdjustment } from "./types";
export function applyLlmAdjustment(scores: ScoringOutput, adj: LlmScoreAdjustment): ScoringOutput {
  const clampAdj = (v: number) => Math.max(-10, Math.min(10, v));
  const a = { opportunity: clampAdj(adj.opportunity), entryTiming: clampAdj(adj.entryTiming), risk: clampAdj(adj.risk), conviction: clampAdj(adj.conviction) };
  const u = { ...scores };
  u.opportunityScore = clamp(scores.opportunityScore + a.opportunity);
  u.entryTimingScore = clamp(scores.entryTimingScore + a.entryTiming);
  u.riskScore = clamp(scores.riskScore + a.risk);
  u.convictionScore = clamp(scores.convictionScore + a.conviction);
  const symbolScore = Math.round(u.opportunityScore * 0.35 + u.entryTimingScore * 0.25 + (100 - u.riskScore) * 0.20 + u.convictionScore * 0.20);
  u.finalEntryScore = clamp(symbolScore);
  return u;
}
