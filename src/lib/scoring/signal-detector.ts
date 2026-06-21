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
    const reasons = [{ code: "forbidden_symbol", message: "forbidden symbol", severity: "blocker" as const }];
    return buildClassification("avoid", "D", reasons, gates, gateDetails, scenario, "Forbidden");
  }
  if (dataConfidence < SIGNAL_THRESHOLDS.dataConfidenceMinimum) {
    const reasons = [{ code: "low_data_confidence", message: `low data confidence (${dataConfidence})`, severity: "blocker" as const }];
    return buildClassification("avoid", "D", reasons, gates, gateDetails, scenario);
  }

  let action: SignalClassification["action"] = "avoid", tier: SignalClassification["tier"] = "D";
  const reasons: SignalDecisionReason[] = [];

  if (scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalStrongMinimum && scores.entryTimingScore >= SIGNAL_THRESHOLDS.entryTimingStrongMinimum && scores.convictionScore >= SIGNAL_THRESHOLDS.convictionStrongMinimum && scores.riskScore <= SIGNAL_THRESHOLDS.riskStrongMaximum && rrOk && dataConfidence >= SIGNAL_THRESHOLDS.dataConfidenceStrong && !eventBlockerActive) {
    action = "strong_entry_candidate"; tier = scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalTierSMinimum ? "S" : "A";
    reasons.push({ code: "strong_gates_passed", message: "all strong gates passed", severity: "info" });
  } else if (scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalEntryMinimum && scores.entryTimingScore >= SIGNAL_THRESHOLDS.entryTimingMinimum && scores.convictionScore >= SIGNAL_THRESHOLDS.convictionMinimum && scores.riskScore <= SIGNAL_THRESHOLDS.riskEntryMaximum && rrOk && dataConfidence >= SIGNAL_THRESHOLDS.dataConfidenceEntry) {
    action = "entry_candidate"; tier = scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalTierAMinimum ? "A" : "B";
    reasons.push({ code: "entry_gates_passed", message: "entry gates passed", severity: "info" });
  } else if (scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalWatchMinimum && scores.riskScore <= SIGNAL_THRESHOLDS.riskWatchMaximum && rrOk) {
    action = "watch"; tier = scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalTierBMinimum ? "B" : "C";
    if (scores.entryTimingScore < SIGNAL_THRESHOLDS.entryTimingMinimum) reasons.push({ code: "entry_timing_weak", message: "entry timing weak", severity: "warning" });
    if (dataConfidence < SIGNAL_THRESHOLDS.dataConfidenceEntry) reasons.push({ code: "data_confidence_borderline", message: "data confidence borderline", severity: "warning" });
    if (!gates.eventBlockerGate) reasons.push({ code: "event_blocker_active", message: "event blocker active", severity: "blocker" });
    reasons.push(...topWeakContributionReasons(scores, "warning"));
    if (reasons.length === 0) reasons.push({ code: "below_entry_threshold", message: "below entry threshold", severity: "warning" });
  } else {
    if (scores.riskScore >= SIGNAL_THRESHOLDS.riskWatchMaximum) reasons.push({ code: "high_risk", message: "high risk", severity: "blocker" });
    if (!rrOk) reasons.push({ code: "insufficient_risk_reward", message: "insufficient RR", severity: "blocker" });
    if (!gates.eventBlockerGate) reasons.push({ code: "event_blocker_active", message: "event blocker active", severity: "blocker" });
    reasons.push(...topWeakContributionReasons(scores, "blocker"));
    if (reasons.length === 0) reasons.push({ code: "below_minimum_thresholds", message: "below minimum thresholds", severity: "warning" });
  }
  return buildClassification(action, tier, reasons, gates, gateDetails, scenario);
}

function topWeakContributionReasons(scores: ScoringOutput, severity: SignalDecisionReason["severity"]): SignalDecisionReason[] {
  return [...scores.contributions.risk, ...scores.contributions.entryTiming, ...scores.contributions.opportunity]
    .filter((contribution) => contribution.polarity === "negative")
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map((contribution) => ({
      code: `weak_${contribution.component}_${contribution.feature}`,
      message: `${contribution.label}: ${contribution.reason}`,
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
    gate("finalEntryScoreGate", "Final entry score", scores.finalEntryScore >= SIGNAL_THRESHOLDS.finalWatchMinimum, scores.finalEntryScore, SIGNAL_THRESHOLDS.finalWatchMinimum, "warning", `final entry score is ${scores.finalEntryScore}`),
    gate("entryTimingGate", "Entry timing", scores.entryTimingScore >= SIGNAL_THRESHOLDS.entryTimingMinimum, scores.entryTimingScore, SIGNAL_THRESHOLDS.entryTimingMinimum, "warning", `entry timing score is ${scores.entryTimingScore}`),
    gate("convictionGate", "Conviction", scores.convictionScore >= SIGNAL_THRESHOLDS.convictionMinimum, scores.convictionScore, SIGNAL_THRESHOLDS.convictionMinimum, "warning", `conviction score is ${scores.convictionScore}`),
    gate("riskGate", "Risk", scores.riskScore <= SIGNAL_THRESHOLDS.riskEntryMaximum, scores.riskScore, SIGNAL_THRESHOLDS.riskEntryMaximum, "blocker", `risk score is ${scores.riskScore}`),
    gate("rrGate", "Risk/reward", rrOk, riskReward, SIGNAL_THRESHOLDS.riskRewardMinimum, "blocker", riskReward == null ? "risk/reward could not be computed" : `risk/reward is ${Math.round(riskReward * 100) / 100}`),
    gate("dataConfidenceGate", "Data confidence", dataConfidence >= SIGNAL_THRESHOLDS.dataConfidenceMinimum, dataConfidence, SIGNAL_THRESHOLDS.dataConfidenceMinimum, "blocker", `data confidence is ${dataConfidence}`),
    gate("eventBlockerGate", "Event blocker", !eventBlockerActive, eventBlockerActive, false, "blocker", eventBlockerActive ? "event blocker is active" : "no event blocker is active"),
    gate("forbiddenGate", "Forbidden symbol", !isForbidden, isForbidden, false, "blocker", isForbidden ? "symbol is forbidden" : "symbol is allowed"),
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
