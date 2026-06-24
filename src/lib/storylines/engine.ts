import type { GenerateStorylineSetInput, StorylineKind, StorylineScenario, StorylineSet, StorylineStatus } from "./types";

function r1(value: number): number {
  return Math.round(value * 10) / 10;
}

function yen(value: number): number {
  return Math.round(value);
}

export function generateStorylineSet(input: GenerateStorylineSetInput): StorylineSet {
  const { scored, dataConfidence, generatedAt, previous } = input;
  const scores = scored.scores;
  const snapshot = scored.snapshot;
  const classification = scored.classification;
  const scenario = classification.scenario;
  const baseTarget = scenario?.targetBase ?? snapshot.close * 1.06;
  const stopPrice = scenario?.stopPrice ?? snapshot.close * 0.95;
  const horizon = scenario?.expectedHoldingPeriod ?? inferHorizon(scores.strategyTags);
  const activeScenario = chooseActiveScenario({
    finalEntryScore: scores.finalEntryScore,
    riskScore: scores.riskScore,
    entryTimingScore: scores.entryTimingScore,
    action: classification.action,
  });
  const revision = classifyRevision({
    previous,
    activeScenario,
    finalEntryScore: scores.finalEntryScore,
    riskScore: scores.riskScore,
    entryTimingScore: scores.entryTimingScore,
    action: classification.action,
  });

  const scenarios = normalizeScenarioProbabilities([
    buildBest(scored, baseTarget, stopPrice, horizon),
    buildBase(scored, baseTarget, stopPrice, horizon, activeScenario),
    buildConservative(scored, baseTarget, stopPrice, horizon),
    buildWorst(scored, baseTarget, stopPrice, horizon),
  ], {
    activeScenario,
    dataConfidence,
    eventBlockerActive: classification.gates.eventBlockerGate === false,
  });

  return {
    symbol: scored.symbol.symbol,
    symbolName: scored.symbol.name,
    generatedAt,
    status: revision.status,
    activeScenario,
    probabilityMethod: "rule-normalized-v1",
    revisionSummary: revision.summary,
    revisionReasons: revision.reasons,
    scoreSnapshot: {
      action: classification.action,
      tier: classification.tier,
      finalEntryScore: scores.finalEntryScore,
      opportunityScore: scores.opportunityScore,
      entryTimingScore: scores.entryTimingScore,
      riskScore: scores.riskScore,
      convictionScore: scores.convictionScore,
      dataConfidence,
      strategyTags: scores.strategyTags,
    },
    scenarios,
  };
}

function buildBest(scored: GenerateStorylineSetInput["scored"], baseTarget: number, stopPrice: number, horizon: string): StorylineScenario {
  const { scores, snapshot, classification } = scored;
  const scenario = classification.scenario;
  const targetPrice = scenario?.targetBull ?? Math.max(baseTarget, snapshot.close * 1.14);
  return {
    kind: "best",
    label: "Best Story",
    probabilityPct: clampProbability(18 + scores.opportunityScore * 0.20 + scores.convictionScore * 0.10 - scores.riskScore * 0.08),
    horizon,
    thesis: "需給・トレンド・テーマが同時に伸び、上位シナリオのターゲットまで評価が進む。",
    expectedReturnPct: r1(((targetPrice - snapshot.close) / snapshot.close) * 100),
    targetPrice: yen(targetPrice),
    stopPrice: yen(stopPrice),
    keyDrivers: compact([
      `最終スコア ${scores.finalEntryScore}`,
      `機会点 ${scores.opportunityScore}`,
      scores.strategyTags.length > 0 ? `戦略: ${scores.strategyTags.join(", ")}` : null,
      scored.layer.impact === "upgrade" ? "個別レイヤーが追い風" : null,
    ]),
    confirmationSignals: compact([
      "出来高を伴って直近高値圏を維持",
      "SMA20を上回る推移が継続",
      scenario ? `RR ${scenario.riskRewardBase} 以上を維持` : null,
    ]),
    invalidationSignals: ["SMA20を明確に割り込む", "出来高増を伴う反落", "リスク点が75以上へ悪化"],
    riskNotes: topRiskNotes(scored),
  };
}

function buildBase(scored: GenerateStorylineSetInput["scored"], baseTarget: number, stopPrice: number, horizon: string, activeScenario: StorylineKind): StorylineScenario {
  const { scores, snapshot, classification } = scored;
  return {
    kind: "base",
    label: "Base Story",
    probabilityPct: clampProbability(34 + scores.finalEntryScore * 0.18 - scores.riskScore * 0.10),
    horizon,
    thesis: activeScenario === "base"
      ? "現在のスコアとゲートが概ね整合し、基本ターゲットを狙う標準シナリオ。"
      : "条件は残るが、現時点の中心仮説として監視するシナリオ。",
    expectedReturnPct: r1(((baseTarget - snapshot.close) / snapshot.close) * 100),
    targetPrice: yen(baseTarget),
    stopPrice: yen(stopPrice),
    keyDrivers: compact([
      `Entry Timing ${scores.entryTimingScore}`,
      `Conviction ${scores.convictionScore}`,
      classification.tierReason,
    ]),
    confirmationSignals: ["終値ベースでエントリー水準を維持", "リスク点が60以下を維持", "出来高が20日平均以上"],
    invalidationSignals: compact([
      classification.scenario ? `無効化ライン ${yen(stopPrice)} を割り込む` : "直近支持線を割り込む",
      "データ信頼度が60未満へ低下",
      "Event Blockerが発生",
    ]),
    riskNotes: topRiskNotes(scored),
  };
}

function buildConservative(scored: GenerateStorylineSetInput["scored"], baseTarget: number, stopPrice: number, horizon: string): StorylineScenario {
  const { scores, snapshot, classification } = scored;
  const conservativeTarget = classification.scenario?.targetConservative ?? snapshot.close + (baseTarget - snapshot.close) * 0.45;
  return {
    kind: "conservative",
    label: "Conservative Story",
    probabilityPct: clampProbability(26 + (100 - scores.riskScore) * 0.10 + scores.entryTimingScore * 0.08),
    horizon,
    thesis: "上値は限定的だが、無効化ラインと段階的な確認を優先して期待値を守るシナリオ。",
    expectedReturnPct: r1(((conservativeTarget - snapshot.close) / snapshot.close) * 100),
    targetPrice: yen(conservativeTarget),
    stopPrice: yen(stopPrice),
    keyDrivers: compact([
      `Risk ${scores.riskScore}`,
      `Data Confidence ${classification.gateDetails.find((gate) => gate.key === "dataConfidenceGate")?.actual ?? "n/a"}`,
      "早めの出口条件確認を優先",
    ]),
    confirmationSignals: ["押し目で下値が浅い", "反発時の出来高が細らない", "弱いゲートが改善する"],
    invalidationSignals: ["反発が弱く横ばい化", "Entry Timingが60未満に低下", "RRが1.2未満に低下"],
    riskNotes: topRiskNotes(scored),
  };
}

function buildWorst(scored: GenerateStorylineSetInput["scored"], baseTarget: number, stopPrice: number, horizon: string): StorylineScenario {
  const { scores, snapshot, classification } = scored;
  const downsideTarget = Math.min(stopPrice, snapshot.close * 0.92);
  return {
    kind: "worst",
    label: "Worst Story",
    probabilityPct: clampProbability(12 + scores.riskScore * 0.20 + (100 - scores.entryTimingScore) * 0.08),
    horizon,
    thesis: "ゲート悪化や需給反転により、ストップ水準まで下落する防御シナリオ。",
    expectedReturnPct: r1(((downsideTarget - snapshot.close) / snapshot.close) * 100),
    targetPrice: yen(downsideTarget),
    stopPrice: yen(stopPrice),
    keyDrivers: compact([
      `Risk ${scores.riskScore}`,
      classification.blockerReason,
      classification.reasons.find((reason) => reason.severity === "blocker")?.message,
    ]),
    confirmationSignals: ["リスク点が75以上に上昇", "出来高を伴う陰線", "市場/セクターがbearishへ悪化"],
    invalidationSignals: ["高値更新と出来高増が同時に発生", `基本ターゲット ${yen(baseTarget)} に向けた再加速`, "弱い寄与度が解消"],
    riskNotes: topRiskNotes(scored),
  };
}

function chooseActiveScenario(input: { finalEntryScore: number; riskScore: number; entryTimingScore: number; action: string }): StorylineKind {
  if (input.action === "avoid" || input.riskScore >= 75) return "worst";
  if (input.finalEntryScore >= 80 && input.riskScore <= 45) return "best";
  if (input.finalEntryScore >= 70 && input.entryTimingScore >= 60 && input.riskScore <= 60) return "base";
  return "conservative";
}

function classifyRevision(input: {
  previous?: { activeScenario: StorylineKind; finalEntryScore: number; riskScore: number; entryTimingScore: number } | null;
  activeScenario: StorylineKind;
  finalEntryScore: number;
  riskScore: number;
  entryTimingScore: number;
  action: string;
}): { status: StorylineStatus; summary: string; reasons: string[] } {
  if (!input.previous) {
    return { status: "new", summary: "初回ストーリーラインを生成しました。", reasons: ["previous storyline is unavailable"] };
  }
  const reasons: string[] = [];
  if (input.previous.activeScenario !== input.activeScenario) reasons.push(`active scenario changed from ${input.previous.activeScenario} to ${input.activeScenario}`);
  if (Math.abs(input.finalEntryScore - input.previous.finalEntryScore) >= 8) reasons.push(`final score moved ${input.previous.finalEntryScore} -> ${input.finalEntryScore}`);
  if (Math.abs(input.riskScore - input.previous.riskScore) >= 8) reasons.push(`risk score moved ${input.previous.riskScore} -> ${input.riskScore}`);
  if (Math.abs(input.entryTimingScore - input.previous.entryTimingScore) >= 10) reasons.push(`entry timing moved ${input.previous.entryTimingScore} -> ${input.entryTimingScore}`);
  if (input.action === "avoid") reasons.push("current action is avoid");
  if (input.action === "avoid" && input.previous.activeScenario !== "worst") return { status: "invalidated", summary: "前回の強気/中立シナリオは無効化され、防御シナリオへ更新されました。", reasons };
  if (reasons.length > 0) return { status: "revised", summary: "新しい観測値に合わせてストーリーラインを改訂しました。", reasons };
  return { status: "unchanged", summary: "前回ストーリーラインから大きな変更はありません。", reasons: ["score drift is below revision threshold"] };
}

function inferHorizon(tags: string[]): string {
  if (tags.includes("breakout")) return "2W-2M";
  if (tags.includes("reversal")) return "1-4M";
  if (tags.includes("trend_follow")) return "1-6M";
  return "1-3M";
}

function clampProbability(value: number): number {
  return Math.max(5, Math.min(80, Math.round(value)));
}

function normalizeScenarioProbabilities(
  scenarios: StorylineScenario[],
  context: { activeScenario: StorylineKind; dataConfidence: number; eventBlockerActive: boolean },
): StorylineScenario[] {
  const raw = scenarios.map((scenario) => {
    let rawWeight = scenario.probabilityPct;
    if (scenario.kind === context.activeScenario) rawWeight *= 1.25;
    if (context.dataConfidence < 60) {
      if (scenario.kind === "best") rawWeight *= 0.55;
      if (scenario.kind === "conservative" || scenario.kind === "worst") rawWeight *= 1.2;
    }
    if (context.eventBlockerActive) {
      if (scenario.kind === "best") rawWeight *= 0.45;
      if (scenario.kind === "base") rawWeight *= 0.8;
      if (scenario.kind === "conservative" || scenario.kind === "worst") rawWeight *= 1.35;
    }
    return { scenario, rawWeight: Math.max(1, rawWeight) };
  });
  const total = raw.reduce((sum, item) => sum + item.rawWeight, 0);
  const floors = raw.map((item) => ({
    ...item,
    normalized: (item.rawWeight / total) * 100,
  }));
  const rounded = floors.map((item) => Math.floor(item.normalized));
  let remainder = 100 - rounded.reduce((sum, value) => sum + value, 0);
  const order = floors
    .map((item, index) => ({ index, fraction: item.normalized - Math.floor(item.normalized) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (const item of order) {
    if (remainder <= 0) break;
    rounded[item.index] += 1;
    remainder -= 1;
  }
  return raw.map((item, index) => ({
    ...item.scenario,
    rawWeight: r1(item.rawWeight),
    normalizedProbabilityPct: rounded[index],
    probabilityPct: rounded[index],
  }));
}

function topRiskNotes(scored: GenerateStorylineSetInput["scored"]): string[] {
  const negative = [...scored.scores.contributions.risk, ...scored.scores.contributions.entryTiming]
    .filter((contribution) => contribution.signedImpact < 0)
    .sort((a, b) => b.impactMagnitude - a.impactMagnitude)
    .slice(0, 3)
    .map((contribution) => `${contribution.label}: ${contribution.reason}`);
  return negative.length > 0 ? negative : ["主要リスクは現時点で限定的"];
}

function compact(values: Array<string | null | undefined>): string[] {
  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}
