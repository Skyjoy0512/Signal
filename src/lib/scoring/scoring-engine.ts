import type { LlmScoreAdjustment, ScoringInput, ScoringOutput, ScoreBreakdown, ScoreComponent, ScoreContribution, ScoreContributions, StrategyTag, StrategyFitScores } from "./types";
import { FINAL_SCORE_CAPS, SCORE_WEIGHTS } from "./config";

function clamp(v: number): number { return Math.max(0, Math.min(100, Math.round(v))); }

type WeightedFeature = { feature: string; label: string; rawScore: number | null; weight: number; reason: string; highIsGood?: boolean; available?: boolean; missingReason?: string };
type ComponentScore<T> = { score: number; breakdown: T; contributions: ScoreContribution[] };

function weightedScore(features: WeightedFeature[]): number {
  const available = availableFeatures(features);
  const totalWeight = available.reduce((sum, feature) => sum + feature.weight, 0);
  if (totalWeight <= 0) return 50;
  return clamp(available.reduce((sum, feature) => sum + (feature.rawScore ?? 50) * (feature.weight / totalWeight), 0));
}

function average(values: number[]): number {
  return values.length === 0 ? 50 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildContributions(component: ScoreComponent, features: WeightedFeature[]): ScoreContribution[] {
  const available = availableFeatures(features);
  const totalWeight = available.reduce((sum, feature) => sum + feature.weight, 0);
  return features.map((feature) => {
    const effectiveScore = feature.rawScore ?? 50;
    const available = isFeatureAvailable(feature);
    const effectiveWeight = available && totalWeight > 0 ? feature.weight / totalWeight : 0;
    const neutralBand = effectiveScore >= 45 && effectiveScore <= 55;
    const highIsGood = feature.highIsGood ?? true;
    const polarity = !available || neutralBand ? "neutral" : (effectiveScore >= 55) === highIsGood ? "positive" : "negative";
    const contribution = Math.round(effectiveScore * effectiveWeight * 10) / 10;
    const impactMagnitude = polarity === "neutral" ? 0 : Math.abs(contribution);
    return {
      component,
      feature: feature.feature,
      label: feature.label,
      rawScore: clamp(effectiveScore),
      weight: Math.round(effectiveWeight * 1000) / 1000,
      contribution,
      signedImpact: polarity === "positive" ? impactMagnitude : polarity === "negative" ? -impactMagnitude : 0,
      impactMagnitude,
      polarity,
      reason: available ? feature.reason : feature.missingReason ?? feature.reason,
      available,
      missingReason: available ? undefined : feature.missingReason ?? feature.reason,
    };
  });
}

function isFeatureAvailable(feature: WeightedFeature): boolean {
  return feature.available ?? feature.rawScore !== null;
}

function availableFeatures(features: WeightedFeature[]): WeightedFeature[] {
  return features.filter((feature) => isFeatureAvailable(feature) && feature.rawScore !== null);
}

function computeOpportunityScore(input: ScoringInput): ComponentScore<ScoreBreakdown["opportunity"]> {
  const { snapshot, symbol: symCond, sector: secCond } = input;
  let trendVal = 50;
  let trendReason = "trend data is neutral or incomplete";
  if (snapshot.sma20 !== null && snapshot.sma50 !== null) {
    if (snapshot.close > snapshot.sma20 && snapshot.sma20 > snapshot.sma50) { trendVal = 85; trendReason = "price is above SMA20 and SMA20 is above SMA50"; }
    else if (snapshot.close > snapshot.sma20) { trendVal = 70; trendReason = "price is above SMA20"; }
    else if (snapshot.close > snapshot.sma50) { trendVal = 55; trendReason = "price is above SMA50 but short-term trend is mixed"; }
    else { trendVal = 30; trendReason = "price is below key moving averages"; }
  }
  if (snapshot.return20d !== null && snapshot.return20d > 5) { trendVal = Math.max(trendVal, 75); trendReason = "20-day return confirms positive momentum"; }
  else if (snapshot.return20d !== null && snapshot.return20d < -5) { trendVal = Math.min(trendVal, 40); trendReason = "20-day return is negative enough to weaken opportunity"; }
  let volumeVal = 50;
  let volumeReason = "volume is near its 20-day average or unknown";
  if (snapshot.volumeRatio20d !== null) {
    if (snapshot.volumeRatio20d > 2.0) { volumeVal = 85; volumeReason = "volume is more than 2x the 20-day average"; }
    else if (snapshot.volumeRatio20d > 1.5) { volumeVal = 75; volumeReason = "volume expansion confirms interest"; }
    else if (snapshot.volumeRatio20d > 1.2) { volumeVal = 65; volumeReason = "volume is moderately above average"; }
    else if (snapshot.volumeRatio20d > 0.8) { volumeVal = 50; volumeReason = "volume is normal"; }
    else if (snapshot.volumeRatio20d > 0.5) { volumeVal = 35; volumeReason = "volume is thin versus recent average"; }
    else { volumeVal = 25; volumeReason = "volume is materially thin"; }
  }
  let relStrength = 50;
  let relStrengthReason = "relative strength versus 52-week high is unknown";
  if (snapshot.distanceFrom52wHighPct !== null) {
    if (snapshot.distanceFrom52wHighPct > -2) { relStrength = 85; relStrengthReason = "price is close to its 52-week high"; }
    else if (snapshot.distanceFrom52wHighPct > -5) { relStrength = 75; relStrengthReason = "price is within 5% of its 52-week high"; }
    else if (snapshot.distanceFrom52wHighPct > -10) { relStrength = 60; relStrengthReason = "price is within 10% of its 52-week high"; }
    else { relStrength = 30; relStrengthReason = "price is far from its 52-week high"; }
  }
  let themeAlignment = 50;
  let themeReason = "sector/symbol layer alignment is neutral or unavailable";
  if (symCond && secCond) {
    if (secCond.impact === "upgrade") { themeAlignment = symCond.strength >= 70 ? 85 : 65; themeReason = "sector impact is positive and symbol layer is aligned"; }
    else if (secCond.impact === "neutral") { themeAlignment = 55; themeReason = "sector impact is neutral"; }
    else { themeAlignment = 40; themeReason = "sector impact is a headwind"; }
  }
  let fundamentalVal = 50;
  let fundamentalReason = "fundamentals are neutral or unavailable";
  const f = input.fundamentals;
  if (f) {
    const qualityParts: number[] = [];
    const growthParts: number[] = [];
    const reasons: string[] = [];
    if (f.roe != null) {
      qualityParts.push(f.roe > 20 ? 85 : f.roe > 15 ? 75 : f.roe > 8 ? 58 : 38);
      reasons.push(`ROE ${Math.round(f.roe)}%`);
    }
    if (f.operatingMargin != null) {
      qualityParts.push(f.operatingMargin > 20 ? 85 : f.operatingMargin > 15 ? 75 : f.operatingMargin > 8 ? 58 : 38);
      reasons.push(`operating margin ${Math.round(f.operatingMargin)}%`);
    }
    if (f.revenueGrowth != null) {
      growthParts.push(f.revenueGrowth > 15 ? 85 : f.revenueGrowth > 10 ? 75 : f.revenueGrowth > 3 ? 60 : f.revenueGrowth > 0 ? 50 : 35);
      reasons.push(`revenue growth ${Math.round(f.revenueGrowth)}%`);
    }
    if (f.epsGrowth != null) {
      growthParts.push(f.epsGrowth > 20 ? 85 : f.epsGrowth > 10 ? 75 : f.epsGrowth > 0 ? 55 : 35);
      reasons.push(`EPS growth ${Math.round(f.epsGrowth)}%`);
    }
    const qualityScore = qualityParts.length > 0 ? average(qualityParts) : 50;
    const growthScore = growthParts.length > 0 ? average(growthParts) : 50;
    let valuationDiscipline = 50;
    if (f.pe != null) {
      valuationDiscipline = f.pe > 100 ? 15 : f.pe > 70 ? 25 : f.pe > 45 ? 40 : f.pe > 30 ? 55 : f.pe > 0 ? 70 : 50;
      reasons.push(`P/E ${Math.round(f.pe)}`);
    }
    fundamentalVal = clamp(qualityScore * 0.40 + growthScore * 0.35 + valuationDiscipline * 0.25);
    fundamentalReason = reasons.length > 0 ? `fundamental quality, growth, and valuation were blended: ${reasons.join(", ")}` : "fundamental inputs are unavailable";
  }
  const catalystVal = 50;
  const hasFundamentals = Boolean(f && [f.roe, f.operatingMargin, f.revenueGrowth, f.epsGrowth, f.pe].some((value) => value != null));
  const features = [
    { feature: "trend", label: "Trend", rawScore: trendVal, weight: SCORE_WEIGHTS.opportunity.trend, reason: trendReason, available: (snapshot.sma20 !== null && snapshot.sma50 !== null) || snapshot.return20d !== null, missingReason: "trend inputs are unavailable" },
    { feature: "volume", label: "Volume", rawScore: volumeVal, weight: SCORE_WEIGHTS.opportunity.volume, reason: volumeReason, available: snapshot.volumeRatio20d !== null, missingReason: "volume ratio is unavailable" },
    { feature: "relativeStrength", label: "Relative strength", rawScore: relStrength, weight: SCORE_WEIGHTS.opportunity.relativeStrength, reason: relStrengthReason, available: snapshot.distanceFrom52wHighPct !== null, missingReason: "52-week relative strength is unavailable" },
    { feature: "theme", label: "Theme alignment", rawScore: themeAlignment, weight: SCORE_WEIGHTS.opportunity.theme, reason: themeReason, available: Boolean(symCond && secCond), missingReason: "symbol and sector layer alignment is unavailable" },
    { feature: "fundamental", label: "Fundamentals", rawScore: fundamentalVal, weight: SCORE_WEIGHTS.opportunity.fundamental, reason: fundamentalReason, available: hasFundamentals, missingReason: "fundamental inputs are unavailable" },
    { feature: "catalyst", label: "Catalyst", rawScore: catalystVal, weight: SCORE_WEIGHTS.opportunity.catalyst, reason: "explicit catalyst data is not yet integrated", available: false, missingReason: "explicit catalyst data is not yet integrated" },
  ];
  return { score: weightedScore(features), breakdown: { trend: trendVal, volume: volumeVal, relativeStrength: relStrength, theme: themeAlignment, fundamental: fundamentalVal, catalyst: catalystVal }, contributions: buildContributions("opportunity", features) };
}

function computeEntryTimingScore(input: ScoringInput): ComponentScore<ScoreBreakdown["entryTiming"]> {
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

  let atrPosition = 50;
  if (snapshot.return5d !== null) {
    const abs5d = Math.abs(snapshot.return5d);
    if (abs5d < 2) atrPosition = 65;
    else if (abs5d < 5) atrPosition = 55;
    else atrPosition = 40;
  }

  let supportResistance = 50;
  if (snapshot.sma20 !== null && snapshot.close > 0) {
    const distToSMA20 = ((snapshot.close - snapshot.sma20) / snapshot.close) * 100;
    if (distToSMA20 > 0 && distToSMA20 < 3) supportResistance = 75;
    else if (distToSMA20 > 0 && distToSMA20 < 5) supportResistance = 65;
    else if (distToSMA20 < 0 && distToSMA20 > -3) supportResistance = 55;
    else supportResistance = 40;
  }

  let priceAction = 50;
  if (snapshot.return5d !== null) {
    if (snapshot.return5d > 2) priceAction = 70;
    else if (snapshot.return5d > 0) priceAction = 60;
    else if (snapshot.return5d > -2) priceAction = 50;
    else priceAction = 40;
  }

  const hasSetupInput = snapshot.sma20 !== null || snapshot.return5d !== null || snapshot.drawdownFromRecentHighPct !== null || snapshot.volumeRatio20d !== null;
  const features = [
    { feature: "setup", label: "Setup", rawScore: setup, weight: SCORE_WEIGHTS.entryTiming.setup, reason: `${setupSignals} setup signal(s) passed`, available: hasSetupInput, missingReason: "setup inputs are unavailable" },
    { feature: "rsiPosition", label: "RSI position", rawScore: rsiPosition, weight: SCORE_WEIGHTS.entryTiming.rsiPosition, reason: snapshot.rsi14 == null ? "RSI is unavailable" : `RSI is ${Math.round(snapshot.rsi14)}`, available: snapshot.rsi14 !== null, missingReason: "RSI is unavailable" },
    { feature: "shortTermVolatilityProxy", label: "Short-term volatility", rawScore: atrPosition, weight: SCORE_WEIGHTS.entryTiming.atrPosition, reason: "5-day absolute return is used as a volatility proxy", available: snapshot.return5d !== null, missingReason: "5-day return is unavailable for volatility proxy" },
    { feature: "supportResistance", label: "Support/resistance", rawScore: supportResistance, weight: SCORE_WEIGHTS.entryTiming.supportResistance, reason: "distance from SMA20 is used as the near-term support proxy", available: snapshot.sma20 !== null, missingReason: "SMA20 is unavailable for support proxy" },
    { feature: "priceAction", label: "Price action", rawScore: priceAction, weight: SCORE_WEIGHTS.entryTiming.priceAction, reason: "5-day return indicates recent price direction", available: snapshot.return5d !== null, missingReason: "5-day return is unavailable" },
  ];
  return { score: weightedScore(features), breakdown: { setup, rsiPosition, atrPosition, supportResistance, priceAction }, contributions: buildContributions("entryTiming", features) };
}

function computeRiskScore(input: ScoringInput): ComponentScore<ScoreBreakdown["risk"]> {
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

  let overheatingVal = 50;
  if (snapshot.rsi14 !== null) {
    if (snapshot.rsi14 > 80) overheatingVal = 90;
    else if (snapshot.rsi14 > 72) overheatingVal = 75;
    else if (snapshot.rsi14 > 65) overheatingVal = 60;
    else overheatingVal = 40;
  }
  if (snapshot.return20d !== null && snapshot.return20d > 15) overheatingVal = Math.max(overheatingVal, 75);

  let trendBreakdownVal = 50;
  if (snapshot.sma20 !== null && snapshot.sma50 !== null) {
    if (snapshot.close < snapshot.sma20 && snapshot.sma20 < snapshot.sma50) trendBreakdownVal = 85;
    else if (snapshot.close < snapshot.sma20) trendBreakdownVal = 65;
    else if (snapshot.close > snapshot.sma20 && snapshot.sma20 > snapshot.sma50) trendBreakdownVal = 30;
  }
  if (snapshot.return20d !== null && snapshot.return20d < -10) trendBreakdownVal = Math.max(trendBreakdownVal, 80);

  let valuationVal = 50;
  if (f?.pe != null) {
    if (f.pe > 80) valuationVal = 90;
    else if (f.pe > 45) valuationVal = 75;
    else if (f.pe > 30) valuationVal = 60;
    else if (f.pe > 0 && f.pe < 15) valuationVal = 35;
  }

  let breakoutFailureVal = 50;
  if (snapshot.distanceFrom52wHighPct !== null || snapshot.return5d !== null || snapshot.volumeRatio20d !== null) {
    breakoutFailureVal = 40;
    if ((snapshot.distanceFrom52wHighPct ?? -100) > -5 && (snapshot.return5d ?? 0) < -3 && (snapshot.volumeRatio20d ?? 1) > 1.2) {
      breakoutFailureVal = 85;
    } else if ((snapshot.distanceFrom52wHighPct ?? -100) > -5 && (snapshot.return5d ?? 0) < 0) {
      breakoutFailureVal = 70;
    } else if ((snapshot.distanceFrom52wHighPct ?? -100) > -2 && (snapshot.rsi14 ?? 0) > 70) {
      breakoutFailureVal = 65;
    }
  }

  const features = [
    { feature: "volatility", label: "Volatility", rawScore: volatilityVal, weight: SCORE_WEIGHTS.risk.volatility, reason: "5-day move and recent drawdown estimate price shock risk", highIsGood: false, available: snapshot.return5d !== null || snapshot.drawdownFromRecentHighPct !== null, missingReason: "volatility inputs are unavailable" },
    { feature: "liquidity", label: "Liquidity risk", rawScore: liquidityVal, weight: SCORE_WEIGHTS.risk.liquidity, reason: "20-day volume ratio estimates liquidity pressure", highIsGood: false, available: snapshot.volumeRatio20d !== null, missingReason: "volume ratio is unavailable" },
    { feature: "event", label: "Event risk", rawScore: eventVal, weight: SCORE_WEIGHTS.risk.event, reason: "event blocker and extreme valuation can raise event/sentiment risk", highIsGood: false, available: true },
    { feature: "market", label: "Market risk", rawScore: marketRisk, weight: SCORE_WEIGHTS.risk.market, reason: "market layer condition adjusts broad market risk", highIsGood: false, available: Boolean(marketCond), missingReason: "market layer is unavailable" },
    { feature: "sector", label: "Sector risk", rawScore: sectorRiskVal, weight: SCORE_WEIGHTS.risk.sector, reason: "sector layer condition adjusts industry risk", highIsGood: false, available: Boolean(sectorCond), missingReason: "sector layer is unavailable" },
    { feature: "data", label: "Data risk", rawScore: dataRisk, weight: SCORE_WEIGHTS.risk.data, reason: "low data confidence increases decision risk", highIsGood: false, available: true },
    { feature: "overheating", label: "Overheating", rawScore: overheatingVal, weight: SCORE_WEIGHTS.risk.overheating, reason: "RSI and 20-day return detect stretched momentum", highIsGood: false, available: snapshot.rsi14 !== null || snapshot.return20d !== null, missingReason: "overheating inputs are unavailable" },
    { feature: "trendBreakdown", label: "Trend breakdown", rawScore: trendBreakdownVal, weight: SCORE_WEIGHTS.risk.trendBreakdown, reason: "moving averages and 20-day return detect trend damage", highIsGood: false, available: (snapshot.sma20 !== null && snapshot.sma50 !== null) || snapshot.return20d !== null, missingReason: "trend breakdown inputs are unavailable" },
    { feature: "valuation", label: "Valuation risk", rawScore: valuationVal, weight: SCORE_WEIGHTS.risk.valuation, reason: "P/E adds a lightweight valuation risk check", highIsGood: false, available: f?.pe != null, missingReason: "P/E is unavailable" },
    { feature: "breakoutFailure", label: "Breakout failure", rawScore: breakoutFailureVal, weight: SCORE_WEIGHTS.risk.breakoutFailure, reason: "near-high weakness and failed momentum raise breakout failure risk", highIsGood: false, available: snapshot.distanceFrom52wHighPct !== null || snapshot.return5d !== null || snapshot.volumeRatio20d !== null, missingReason: "breakout failure inputs are unavailable" },
  ];
  return {
    score: weightedScore(features),
    breakdown: {
      volatility: volatilityVal,
      liquidity: liquidityVal,
      event: eventVal,
      market: marketRisk,
      sector: sectorRiskVal,
      data: dataRisk,
      overheating: overheatingVal,
      trendBreakdown: trendBreakdownVal,
      valuation: valuationVal,
      breakoutFailure: breakoutFailureVal,
    },
    contributions: buildContributions("risk", features),
  };
}

function computeConvictionScore(input: ScoringInput): ComponentScore<ScoreBreakdown["conviction"]> {
  const { dataConfidence, market, sector, theme, symbol, snapshot } = input;
  const dataConf = Math.min(dataConfidence, 100);

  let alignCount = 0;
  for (const lc of [symbol, sector, theme, market]) {
    if (lc && (lc.condition === "strong_bullish" || lc.condition === "bullish")) alignCount++;
  }
  const multiLayerAlignment = alignCount >= 4 ? 95 : alignCount >= 3 ? 80 : alignCount >= 2 ? 65 : alignCount >= 1 ? 50 : 30;

  let techSignals = 0;
  if (snapshot.sma20 !== null && snapshot.close > snapshot.sma20) techSignals++;
  if (snapshot.sma50 !== null && snapshot.close > snapshot.sma50) techSignals++;
  if (snapshot.rsi14 !== null && snapshot.rsi14 >= 45 && snapshot.rsi14 <= 65) techSignals++;
  if (snapshot.volumeRatio20d !== null && snapshot.volumeRatio20d > 1.0) techSignals++;
  if (snapshot.return20d !== null && snapshot.return20d > 0) techSignals++;
  const techConf = 30 + techSignals * 12;

  let fundConf = 50;
  const f = input.fundamentals;
  const hasFundamentals = Boolean(f && [f.roe, f.operatingMargin, f.revenueGrowth, f.epsGrowth].some((value) => value != null));
  if (f) {
    let fCount = 0;
    if (f.roe != null && f.roe > 8) fCount++;
    if (f.operatingMargin != null && f.operatingMargin > 8) fCount++;
    if (f.revenueGrowth != null && f.revenueGrowth > 0) fCount++;
    if (f.epsGrowth != null && f.epsGrowth > 0) fCount++;
    fundConf = 30 + fCount * 15;
  }

  const llmConf = 50;

  const features = [
    { feature: "dataConfidence", label: "Data confidence", rawScore: dataConf, weight: SCORE_WEIGHTS.conviction.dataConfidence, reason: `data confidence is ${Math.round(dataConf)}`, available: true },
    { feature: "multiLayerAlignment", label: "Layer alignment", rawScore: multiLayerAlignment, weight: SCORE_WEIGHTS.conviction.multiLayerAlignment, reason: `${alignCount} bullish layer(s) are aligned`, available: Boolean(symbol || sector || theme || market), missingReason: "market, sector, theme, and symbol layers are unavailable" },
    { feature: "technicalConfirmation", label: "Technical confirmation", rawScore: techConf, weight: SCORE_WEIGHTS.conviction.technicalConfirmation, reason: `${techSignals} technical confirmation signal(s) passed`, available: snapshot.sma20 !== null || snapshot.sma50 !== null || snapshot.rsi14 !== null || snapshot.volumeRatio20d !== null || snapshot.return20d !== null, missingReason: "technical confirmation inputs are unavailable" },
    { feature: "fundamentalConfirmation", label: "Fundamental confirmation", rawScore: fundConf, weight: SCORE_WEIGHTS.conviction.fundamentalConfirmation, reason: f ? "fundamental quality inputs were checked" : "fundamental inputs are unavailable", available: hasFundamentals, missingReason: "fundamental confirmation inputs are unavailable" },
    { feature: "llmConfidence", label: "LLM confidence", rawScore: llmConf, weight: SCORE_WEIGHTS.conviction.llmConfidence, reason: "LLM confidence is neutral before the LLM pass", available: false, missingReason: "LLM confidence is only available after the LLM pass" },
  ];
  return { score: weightedScore(features), breakdown: { dataConfidence: dataConf, multiLayerAlignment, technicalConfirmation: techConf, fundamentalConfirmation: fundConf, llmConfidence: llmConf }, contributions: buildContributions("conviction", features) };
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

function computeFinalEntryScore(symbolScore: number, input: ScoringInput, riskScore: number): number {
  return applyFinalScoreCaps(computeFinalEntryScoreUncapped(symbolScore, input), input, riskScore);
}

function applyFinalScoreCaps(score: number, input: ScoringInput, riskScore: number): number {
  let capped = score;
  if (input.isForbidden) capped = Math.min(capped, FINAL_SCORE_CAPS.forbidden);
  if (input.dataConfidence < 60) capped = Math.min(capped, FINAL_SCORE_CAPS.lowDataConfidence);
  if (input.eventBlockerActive) capped = Math.min(capped, FINAL_SCORE_CAPS.eventBlocker);
  if (riskScore >= 85) capped = Math.min(capped, FINAL_SCORE_CAPS.extremeRisk);
  else if (riskScore >= 75) capped = Math.min(capped, FINAL_SCORE_CAPS.highRisk);
  if (input.market?.condition === "strong_bearish" || input.market?.condition === "bearish") {
    capped = Math.min(capped, FINAL_SCORE_CAPS.bearishMarket);
  }
  return clamp(capped);
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
  const symbolScore = Math.round(opp.score * SCORE_WEIGHTS.finalEntry.opportunityScore + et.score * SCORE_WEIGHTS.finalEntry.entryTimingScore + (100 - risk.score) * SCORE_WEIGHTS.finalEntry.riskControl + conv.score * SCORE_WEIGHTS.finalEntry.convictionScore);
  const uncappedFinalEntryScore = computeFinalEntryScoreUncapped(symbolScore, input);
  const finalEntryScore = computeFinalEntryScore(symbolScore, input, risk.score);
  const contributions: ScoreContributions = {
    opportunity: opp.contributions,
    entryTiming: et.contributions,
    risk: risk.contributions,
    conviction: conv.contributions,
    finalEntry: buildContributions("finalEntry", [
      { feature: "opportunityScore", label: "Opportunity score", rawScore: opp.score, weight: SCORE_WEIGHTS.finalEntry.opportunityScore, reason: "medium-term opportunity contribution" },
      { feature: "entryTimingScore", label: "Entry timing score", rawScore: et.score, weight: SCORE_WEIGHTS.finalEntry.entryTimingScore, reason: "near-term entry timing contribution" },
      { feature: "riskControl", label: "Risk control", rawScore: 100 - risk.score, weight: SCORE_WEIGHTS.finalEntry.riskControl, reason: "risk score is inverted for final entry scoring" },
      { feature: "convictionScore", label: "Conviction score", rawScore: conv.score, weight: SCORE_WEIGHTS.finalEntry.convictionScore, reason: "confidence and evidence alignment contribution" },
      { feature: "riskCap", label: "Risk cap", rawScore: finalEntryScore, weight: 0, reason: finalEntryScore < uncappedFinalEntryScore ? `risk/data gate capped final score from ${uncappedFinalEntryScore} to ${finalEntryScore}` : "no final score cap applied" },
    ]),
  };
  const featureAvailability = collectFeatureAvailability(contributions);

  return {
    opportunityScore: opp.score, entryTimingScore: et.score, riskScore: risk.score, convictionScore: conv.score,
    finalEntryScore, strategyFitScores, strategyTags,
    breakdown: { opportunity: opp.breakdown, entryTiming: et.breakdown, risk: risk.breakdown, conviction: conv.breakdown },
    contributions,
    featureAvailability,
  };
}

export function applyLlmAdjustment(scores: ScoringOutput, adj: LlmScoreAdjustment, input: ScoringInput): ScoringOutput {
  const clampAdj = (v: number) => Math.max(-10, Math.min(10, v));
  const a = { opportunity: clampAdj(adj.opportunity), entryTiming: clampAdj(adj.entryTiming), risk: clampAdj(adj.risk), conviction: clampAdj(adj.conviction) };
  const u: ScoringOutput = {
    ...scores,
    contributions: {
      opportunity: [...scores.contributions.opportunity],
      entryTiming: [...scores.contributions.entryTiming],
      risk: [...scores.contributions.risk],
      conviction: [...scores.contributions.conviction],
      finalEntry: [...scores.contributions.finalEntry],
    },
  };
  u.opportunityScore = clamp(scores.opportunityScore + a.opportunity);
  u.entryTimingScore = clamp(scores.entryTimingScore + a.entryTiming);
  u.riskScore = clamp(scores.riskScore + a.risk);
  u.convictionScore = clamp(scores.convictionScore + a.conviction);
  const symbolScore = Math.round(u.opportunityScore * SCORE_WEIGHTS.finalEntry.opportunityScore + u.entryTimingScore * SCORE_WEIGHTS.finalEntry.entryTimingScore + (100 - u.riskScore) * SCORE_WEIGHTS.finalEntry.riskControl + u.convictionScore * SCORE_WEIGHTS.finalEntry.convictionScore);
  const uncappedFinalEntryScore = computeFinalEntryScoreUncapped(symbolScore, input);
  u.finalEntryScore = computeFinalEntryScore(symbolScore, input, u.riskScore);
  u.contributions.opportunity.push(llmContribution("opportunity", a.opportunity, adj.reason));
  u.contributions.entryTiming.push(llmContribution("entryTiming", a.entryTiming, adj.reason));
  u.contributions.risk.push(llmContribution("risk", a.risk, adj.reason, false));
  u.contributions.conviction.push(llmContribution("conviction", a.conviction, adj.reason));
  u.contributions.finalEntry = buildContributions("finalEntry", [
    { feature: "opportunityScore", label: "Opportunity score", rawScore: u.opportunityScore, weight: SCORE_WEIGHTS.finalEntry.opportunityScore, reason: "LLM-adjusted opportunity contribution" },
    { feature: "entryTimingScore", label: "Entry timing score", rawScore: u.entryTimingScore, weight: SCORE_WEIGHTS.finalEntry.entryTimingScore, reason: "LLM-adjusted entry timing contribution" },
    { feature: "riskControl", label: "Risk control", rawScore: 100 - u.riskScore, weight: SCORE_WEIGHTS.finalEntry.riskControl, reason: "LLM-adjusted risk score is inverted for final entry scoring" },
    { feature: "convictionScore", label: "Conviction score", rawScore: u.convictionScore, weight: SCORE_WEIGHTS.finalEntry.convictionScore, reason: "LLM-adjusted conviction contribution" },
    { feature: "riskCap", label: "Risk cap", rawScore: u.finalEntryScore, weight: 0, reason: u.finalEntryScore < uncappedFinalEntryScore ? `risk/data gate capped LLM-adjusted final score from ${uncappedFinalEntryScore} to ${u.finalEntryScore}` : "no final score cap applied after LLM adjustment" },
  ]);
  return u;
}

export function applyTechnicalQualityOverlay(scores: ScoringOutput, input: ScoringInput, qualityScore: number, reasons: string[]): ScoringOutput {
  const boundedQuality = clamp(qualityScore);
  const adjustment = Math.max(-8, Math.min(8, Math.round((boundedQuality - 50) * 0.16)));
  if (adjustment === 0) return scores;

  const u = cloneScores(scores);
  u.convictionScore = clamp(scores.convictionScore + Math.round(adjustment * 0.7));
  const symbolScore = Math.round(u.opportunityScore * SCORE_WEIGHTS.finalEntry.opportunityScore + u.entryTimingScore * SCORE_WEIGHTS.finalEntry.entryTimingScore + (100 - u.riskScore) * SCORE_WEIGHTS.finalEntry.riskControl + u.convictionScore * SCORE_WEIGHTS.finalEntry.convictionScore);
  u.finalEntryScore = computeFinalEntryScore(symbolScore, input, u.riskScore);
  const reason = reasons.length > 0 ? reasons.join("; ") : "technical quality overlay";
  u.contributions.conviction.push({
    component: "conviction",
    feature: "technicalQualityOverlay",
    label: "Technical quality overlay",
    rawScore: boundedQuality,
    weight: 0.1,
    contribution: adjustment,
    signedImpact: adjustment,
    impactMagnitude: Math.abs(adjustment),
    polarity: adjustment > 0 ? "positive" : "negative",
    reason,
  });
  u.contributions.finalEntry = buildContributions("finalEntry", [
    { feature: "opportunityScore", label: "Opportunity score", rawScore: u.opportunityScore, weight: SCORE_WEIGHTS.finalEntry.opportunityScore, reason: "technical-overlay-adjusted opportunity contribution" },
    { feature: "entryTimingScore", label: "Entry timing score", rawScore: u.entryTimingScore, weight: SCORE_WEIGHTS.finalEntry.entryTimingScore, reason: "technical-overlay-adjusted entry timing contribution" },
    { feature: "riskControl", label: "Risk control", rawScore: 100 - u.riskScore, weight: SCORE_WEIGHTS.finalEntry.riskControl, reason: "risk score is inverted for final entry scoring" },
    { feature: "convictionScore", label: "Conviction score", rawScore: u.convictionScore, weight: SCORE_WEIGHTS.finalEntry.convictionScore, reason: "technical quality adjusted conviction contribution" },
    { feature: "technicalQualityOverlay", label: "Technical quality overlay", rawScore: boundedQuality, weight: 0.1, reason },
    { feature: "riskCap", label: "Risk cap", rawScore: u.finalEntryScore, weight: 0, reason: u.finalEntryScore < symbolScore ? `risk/data gate capped technical-overlay final score from ${symbolScore} to ${u.finalEntryScore}` : "no final score cap applied after technical overlay" },
  ]);
  return u;
}

function computeFinalEntryScoreUncapped(symbolScore: number, input: ScoringInput): number {
  return clamp(symbolScore + marketScoreAdjustment(input.market) + sectorScoreAdjustment(input.sector));
}

function marketScoreAdjustment(marketCond: ScoringInput["market"]): number {
  if (!marketCond) return 0;
  if (marketCond.condition === "strong_bullish") return 10;
  if (marketCond.condition === "bullish") return 5;
  if (marketCond.condition === "bearish") return -10;
  if (marketCond.condition === "strong_bearish") return -20;
  return 0;
}

function sectorScoreAdjustment(sectorCond: ScoringInput["sector"]): number {
  if (!sectorCond) return 0;
  if (sectorCond.condition === "strong_bullish") return 8;
  if (sectorCond.condition === "bullish") return 4;
  if (sectorCond.condition === "bearish") return -6;
  if (sectorCond.condition === "strong_bearish") return -12;
  return 0;
}

function cloneScores(scores: ScoringOutput): ScoringOutput {
  return {
    ...scores,
    contributions: {
      opportunity: [...scores.contributions.opportunity],
      entryTiming: [...scores.contributions.entryTiming],
      risk: [...scores.contributions.risk],
      conviction: [...scores.contributions.conviction],
      finalEntry: [...scores.contributions.finalEntry],
    },
  };
}

function collectFeatureAvailability(contributions: ScoreContributions): Record<string, boolean> {
  const availability: Record<string, boolean> = {};
  for (const [component, componentContributions] of Object.entries(contributions) as [ScoreComponent, ScoreContribution[]][]) {
    for (const contribution of componentContributions) {
      availability[`${component}.${contribution.feature}`] = contribution.available ?? true;
    }
  }
  return availability;
}

function llmContribution(component: ScoreComponent, adjustment: number, reason: string, highIsGood: boolean = true): ScoreContribution {
  const polarity = adjustment === 0 ? "neutral" : (adjustment > 0) === highIsGood ? "positive" : "negative";
  const impactMagnitude = Math.abs(adjustment);
  return {
    component,
    feature: "llmAdjustment",
    label: "LLM adjustment",
    rawScore: adjustment,
    weight: 1,
    contribution: adjustment,
    signedImpact: polarity === "positive" ? impactMagnitude : polarity === "negative" ? -impactMagnitude : 0,
    impactMagnitude,
    polarity,
    reason,
  };
}
