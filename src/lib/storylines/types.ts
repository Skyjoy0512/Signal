import type { ScoredSymbol } from "../jobs/types";

export type StorylineKind = "best" | "base" | "conservative" | "worst";
export type StorylineStatus = "new" | "unchanged" | "revised" | "invalidated";

export interface StorylineScenario {
  kind: StorylineKind;
  label: string;
  probabilityPct: number;
  horizon: string;
  thesis: string;
  expectedReturnPct: number;
  targetPrice: number;
  stopPrice: number;
  keyDrivers: string[];
  confirmationSignals: string[];
  invalidationSignals: string[];
  riskNotes: string[];
}

export interface StorylineSet {
  symbol: string;
  symbolName?: string | null;
  generatedAt: string;
  status: StorylineStatus;
  activeScenario: StorylineKind;
  revisionSummary: string;
  revisionReasons: string[];
  scoreSnapshot: {
    action: string;
    tier: string;
    finalEntryScore: number;
    opportunityScore: number;
    entryTimingScore: number;
    riskScore: number;
    convictionScore: number;
    dataConfidence: number;
    strategyTags: string[];
  };
  scenarios: StorylineScenario[];
}

export interface PreviousStorylineSet {
  symbol: string;
  activeScenario: StorylineKind;
  finalEntryScore: number;
  riskScore: number;
  entryTimingScore: number;
  generatedAt?: string;
}

export interface GenerateStorylineSetInput {
  scored: ScoredSymbol;
  dataConfidence: number;
  generatedAt: string;
  previous?: PreviousStorylineSet | null;
}
