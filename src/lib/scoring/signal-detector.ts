import type { LayerCondition, SymbolSnapshot } from "../intelligence/types";
import type { ScoringOutput, SignalClassification, SignalDecisionReason, SignalGateDetail, TradeScenario } from "./types";
import { computeTradeScenario } from "./target-stop";
import { SIGNAL_THRESHOLDS } from "./config";

export interface SignalDetectorInput {
  scores: ScoringOutput; market: LayerCondition | null; symbol: LayerCondition | null;
  dataConfidence: number; eventBlockerActive: boolean; isForbidden: boolean;
  snapshot?: SymbolSnapshot | null;
  atr20?: number | null; swingHigh?: number | null; swingLow?: number | null; high6m?: number | null;
  entryPrice: number;
}

export function detectSignal(input: SignalDetectorInput): SignalClassification {
  const { scores, dataConfidence, eventBlockerActive, isForbidden } = input;
  let scenario: TradeScenario | null = null;
  try {
    const snap = input.snapshot ?? {
      symbol: "", close: input.entryPrice, sma20: null, sma50: null, sma200: null,
      rsi14: null, volumeRatio20d: null, return5d: null, return20d: null,
      distanceFrom52wHighPct: null, drawdownFromRecentHighPct: null,
    };
    scenario = computeTradeScenario({
      snapshot: snap,
      atr20: input.atr20,
      swingHigh: input.swingHigh,
      swingLow: input.swingLow,
      high6m: input.high6m,
      strategyTags: scores.strategyTags,
    });
  } catch { /* fallback: scenario stays null */ }
  const rrOk = scenario ? scenario.riskRewardBase >= SIGNAL_THRESHOLDS.riskRewardMinimum : false;
  const gateDetails = buildGateDetails({ scores, dataConfidence, eventBlockerActive, isForbidden, riskReward: scenario?.riskRewardBase ?? null, rrOk });
  const gates = Object.fromEntries(gateDetails.map((gate) => [gate.key, gate.passed]));

  if (isForbidden) {
    const reasons = [{ code: "forbidden_symbol", message: "対象外銘柄のため見送り", severity: "blocker" as const }];
    return buildClassification("avoid", "D", reasons, gates, gateDetails, scenario, "対象外銘柄");
  }
  if (dataConfidence < SIGNAL_THRESHOLDS.dataConfidenceMinimum) {
    const reasons = [{ code: "low_data_confidence", message: `データ不足のため候補度は低信頼 (${dataConfidence})`, severity: "blocker" as const }];
    return buildClassification("avoid", "D", reasons, gates, gateDetails, scenario);
  }

  let action: SignalClassification["action"] = "avoid", tier: SignalClassification["tier"] = "D";
  const reasons: SignalDecisionReason[] = [];

  if (scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalStrongMinimum && scores.entryTimingScore >= SIGNAL_THRESHOLDS.entryTimingStrongMinimum && scores.convictionScore >= SIGNAL_THRESHOLDS.convictionStrongMinimum && scores.riskScore <= SIGNAL_THRESHOLDS.riskStrongMaximum && rrOk && dataConfidence >= SIGNAL_THRESHOLDS.dataConfidenceStrong && !eventBlockerActive) {
    action = "strong_entry_candidate"; tier = scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalTierSMinimum ? "S" : "A";
    reasons.push({ code: "strong_gates_passed", message: "主要ゲートをすべて通過。最優先でレビューする候補", severity: "info" });
  } else if (scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalEntryMinimum && scores.entryTimingScore >= SIGNAL_THRESHOLDS.entryTimingMinimum && scores.convictionScore >= SIGNAL_THRESHOLDS.convictionMinimum && scores.riskScore <= SIGNAL_THRESHOLDS.riskEntryMaximum && rrOk && dataConfidence >= SIGNAL_THRESHOLDS.dataConfidenceEntry) {
    action = "entry_candidate"; tier = scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalTierAMinimum ? "A" : "B";
    reasons.push({ code: "entry_gates_passed", message: "候補度は高いが、リスクと前提条件の追加確認が必要", severity: "info" });
  } else if (scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalWatchMinimum && scores.riskScore <= SIGNAL_THRESHOLDS.riskWatchMaximum && rrOk) {
    action = "watch"; tier = scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalTierBMinimum ? "B" : "C";
    if (scores.entryTimingScore < SIGNAL_THRESHOLDS.entryTimingMinimum) reasons.push({ code: "entry_timing_weak", message: "タイミング条件が弱いため監視に留める", severity: "warning" });
    if (dataConfidence < SIGNAL_THRESHOLDS.dataConfidenceEntry) reasons.push({ code: "data_confidence_borderline", message: "データ信頼度が境界域のため追加確認が必要", severity: "warning" });
    if (!gates.eventBlockerGate) reasons.push({ code: "event_blocker_active", message: "決算/イベント前後のため参考扱い", severity: "blocker" });
    reasons.push(...topWeakContributionReasons(scores, "warning"));
    if (reasons.length === 0) reasons.push({ code: "below_entry_threshold", message: "候補入りには一段不足しているため監視", severity: "warning" });
  } else {
    if (scores.riskScore >= SIGNAL_THRESHOLDS.riskWatchMaximum) reasons.push({ code: "high_risk", message: "リスク確認が必要なため候補度を抑制", severity: "blocker" });
    if (!rrOk) reasons.push({ code: "insufficient_risk_reward", message: "RRが不足しているため追加確認扱い", severity: "blocker" });
    if (!gates.eventBlockerGate) reasons.push({ code: "event_blocker_active", message: "決算/イベント前後のため参考扱い", severity: "blocker" });
    reasons.push(...topWeakContributionReasons(scores, "blocker"));
    if (reasons.length === 0) reasons.push({ code: "below_minimum_thresholds", message: "最低条件を満たさないため見送り", severity: "warning" });
  }
  return buildClassification(action, tier, reasons, gates, gateDetails, scenario);
}

function topWeakContributionReasons(scores: ScoringOutput, severity: SignalDecisionReason["severity"]): SignalDecisionReason[] {
  return [...scores.contributions.risk, ...scores.contributions.entryTiming, ...scores.contributions.opportunity]
    .filter((contribution) => contribution.signedImpact < 0)
    .sort((a, b) => b.impactMagnitude - a.impactMagnitude)
    .slice(0, 2)
    .map((contribution) => ({
      code: `weak_${contribution.component}_${contribution.feature}`,
      message: `${contribution.label}が弱い: ${contribution.reason}`,
      severity,
    }));
}

function buildGateDetails(input: {
  scores: ScoringOutput;
  dataConfidence: number;
  eventBlockerActive: boolean;
  isForbidden: boolean;
  riskReward: number | null;
  rrOk: boolean;
}): SignalGateDetail[] {
  const { scores, dataConfidence, eventBlockerActive, isForbidden, riskReward, rrOk } = input;
  return [
    gate("finalEntryScoreGate", "候補度", scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalWatchMinimum, scores.finalEntryScore, SIGNAL_THRESHOLDS.finalWatchMinimum, "warning", `候補度スコア: ${scores.finalEntryScore}`),
    gate("entryTimingGate", "タイミング", scores.entryTimingScore >= SIGNAL_THRESHOLDS.entryTimingMinimum, scores.entryTimingScore, SIGNAL_THRESHOLDS.entryTimingMinimum, "warning", `タイミングスコア: ${scores.entryTimingScore}`),
    gate("convictionGate", "確信度", scores.convictionScore >= SIGNAL_THRESHOLDS.convictionMinimum, scores.convictionScore, SIGNAL_THRESHOLDS.convictionMinimum, "warning", `確信度スコア: ${scores.convictionScore}`),
    gate("riskGate", "リスク", scores.riskScore <= SIGNAL_THRESHOLDS.riskEntryMaximum, scores.riskScore, SIGNAL_THRESHOLDS.riskEntryMaximum, "blocker", `リスクスコア: ${scores.riskScore}`),
    gate("rrGate", "RR", rrOk, riskReward, SIGNAL_THRESHOLDS.riskRewardMinimum, "blocker", riskReward == null ? "RRを算出できません" : `RR: ${Math.round(riskReward * 100) / 100}`),
    gate("dataConfidenceGate", "データ信頼度", dataConfidence >= SIGNAL_THRESHOLDS.dataConfidenceMinimum, dataConfidence, SIGNAL_THRESHOLDS.dataConfidenceMinimum, "blocker", `データ信頼度: ${dataConfidence}`),
    gate("eventBlockerGate", "イベント", !eventBlockerActive, eventBlockerActive, false, "blocker", eventBlockerActive ? "決算/イベントブロッカーあり" : "イベントブロッカーなし"),
    gate("forbiddenGate", "対象外銘柄", !isForbidden, isForbidden, false, "blocker", isForbidden ? "対象外銘柄です" : "対象銘柄です"),
  ];
}

function gate(
  key: string,
  label: string,
  passed: boolean,
  actual: number | boolean | null,
  threshold: number | boolean,
  severity: SignalGateDetail["severity"],
  reason: string,
): SignalGateDetail {
  return { key, label, passed, actual, threshold, severity, reason };
}

function buildClassification(
  action: SignalClassification["action"],
  tier: SignalClassification["tier"],
  reasons: SignalDecisionReason[],
  gates: Record<string, boolean>,
  gateDetails: SignalGateDetail[],
  scenario: TradeScenario | null,
  blockerReason?: string,
): SignalClassification {
  const tierReason = reasons.map((reason) => reason.message).join("; ");
  return {
    action,
    tier,
    tierReason,
    blockerReason: blockerReason ?? (action === "avoid" ? tierReason : undefined),
    gates,
    gateDetails,
    reasons,
    scenario,
  };
}
