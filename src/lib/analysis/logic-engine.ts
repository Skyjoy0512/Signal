import { applyTechnicalQualityOverlay, computeAllScores } from "../scoring/scoring-engine";
import { detectSignal } from "../scoring/signal-detector";
import type { ScoringInput } from "../scoring/types";
import { computeAdvancedSignalFeatures } from "./advanced-engine";
import type { AnalysisLogicEngine, AnalysisSubject, LogicAnalysisResult } from "./types";

export class RuleBasedAnalysisEngine implements AnalysisLogicEngine {
  analyze(subject: AnalysisSubject): LogicAnalysisResult {
    const scoringInput: ScoringInput = {
      snapshot: subject.snapshot,
      market: subject.market,
      sector: subject.sector,
      theme: subject.theme,
      symbol: subject.symbolLayer,
      dataConfidence: subject.dataConfidence,
      eventBlockerActive: subject.eventBlockerActive,
      isForbidden: subject.isForbidden,
      fundamentals: subject.fundamentals,
    };
    let scores = computeAllScores(scoringInput);

    if (subject.priceHistory && subject.priceHistory.length > 0) {
      const advanced = computeAdvancedSignalFeatures(subject.priceHistory);
      scores = applyTechnicalQualityOverlay(scores, scoringInput, advanced.qualityScore, advanced.reasons);
    }

    const classification = detectSignal({
      scores,
      snapshot: subject.snapshot,
      market: subject.market,
      symbol: subject.symbolLayer,
      dataConfidence: subject.dataConfidence,
      eventBlockerActive: subject.eventBlockerActive,
      isForbidden: subject.isForbidden,
      entryPrice: subject.snapshot.close,
    });

    return { scores, classification, scoringInput };
  }
}
