import type { LayerCondition, SymbolSnapshot } from "../intelligence/types";
import type { ScoringOutput, SignalClassification, TradeScenario } from "./types";
import { computeTradeScenario } from "./target-stop";

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
    });
  } catch { /* fallback: scenario stays null */ }
  const rrOk = scenario ? scenario.riskRewardBase >= 1.2 : false;
  const gates = { finalEntryScoreGate: scores.finalEntryScore >= 60, entryTimingGate: scores.entryTimingScore >= 60, convictionGate: scores.convictionScore >= 60, riskGate: scores.riskScore <= 60, rrGate: rrOk, dataConfidenceGate: dataConfidence >= 60, eventBlockerGate: !eventBlockerActive, forbiddenGate: !isForbidden };

  if (isForbidden) return { action: "avoid", tier: "D", tierReason: "forbidden symbol", blockerReason: "Forbidden", gates, scenario };
  if (dataConfidence < 60) return { action: "avoid", tier: "D", tierReason: `low data confidence (${dataConfidence})`, gates, scenario };

  let action: SignalClassification["action"] = "avoid", tier: SignalClassification["tier"] = "D";
  const tr: string[] = [];

  if (scores.finalEntryScore >= 80 && scores.entryTimingScore >= 70 && scores.convictionScore >= 70 && scores.riskScore <= 45 && rrOk && dataConfidence >= 80 && !eventBlockerActive) {
    action = "strong_entry_candidate"; tier = scores.finalEntryScore >= 88 ? "S" : "A"; tr.push("all strong gates passed");
  } else if (scores.finalEntryScore >= 70 && scores.entryTimingScore >= 60 && scores.convictionScore >= 60 && scores.riskScore <= 60 && rrOk && dataConfidence >= 70) {
    action = "entry_candidate"; tier = scores.finalEntryScore >= 78 ? "A" : "B"; tr.push("entry gates passed");
  } else if (scores.finalEntryScore >= 60 && scores.riskScore <= 75 && rrOk) {
    action = "watch"; tier = scores.finalEntryScore >= 68 ? "B" : "C";
    const weak: string[] = [];
    if (scores.entryTimingScore < 60) weak.push("entry timing weak");
    if (dataConfidence < 70) weak.push("data confidence borderline");
    if (!gates.eventBlockerGate) weak.push("event blocker active");
    tr.push(weak.length > 0 ? weak.join("; ") : "below entry threshold");
  } else {
    const bl: string[] = [];
    if (scores.riskScore >= 75) bl.push("high risk");
    if (!rrOk) bl.push("insufficient RR");
    if (!gates.eventBlockerGate) bl.push("event blocker active");
    tr.push(bl.length > 0 ? bl.join("; ") : "below minimum thresholds");
  }
  return { action, tier, tierReason: tr.join("; "), blockerReason: action === "avoid" ? tr.join("; ") : undefined, gates, scenario };
}
