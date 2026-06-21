import type { Json, StorylineScenarioRow, StorylineSetRow } from "../supabase/types";
import type { StorylineKind, StorylineScenario, StorylineSet, StorylineStatus } from "./types";

export function storylineSetFromRows(set: StorylineSetRow, scenarios: StorylineScenarioRow[]): StorylineSet {
  return {
    symbol: set.symbol,
    generatedAt: set.generated_at,
    status: parseStatus(set.status),
    activeScenario: parseKind(set.active_scenario),
    revisionSummary: set.revision_summary ?? "",
    revisionReasons: jsonArrayOfStrings(set.revision_reasons_json),
    scoreSnapshot: parseScoreSnapshot(set.score_snapshot_json),
    scenarios: scenarios.map((scenario) => storylineScenarioFromRow(scenario)),
  };
}

function storylineScenarioFromRow(row: StorylineScenarioRow): StorylineScenario {
  return {
    kind: parseKind(row.scenario_kind),
    label: row.label,
    probabilityPct: row.probability_pct,
    horizon: row.horizon,
    thesis: row.thesis,
    expectedReturnPct: row.expected_return_pct,
    targetPrice: row.target_price,
    stopPrice: row.stop_price,
    keyDrivers: jsonArrayOfStrings(row.key_drivers_json),
    confirmationSignals: jsonArrayOfStrings(row.confirmation_signals_json),
    invalidationSignals: jsonArrayOfStrings(row.invalidation_signals_json),
    riskNotes: jsonArrayOfStrings(row.risk_notes_json),
  };
}

function parseScoreSnapshot(value: Json): StorylineSet["scoreSnapshot"] {
  const record = typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
  return {
    action: stringValue(record.action),
    tier: stringValue(record.tier),
    finalEntryScore: numberValue(record.finalEntryScore),
    opportunityScore: numberValue(record.opportunityScore),
    entryTimingScore: numberValue(record.entryTimingScore),
    riskScore: numberValue(record.riskScore),
    convictionScore: numberValue(record.convictionScore),
    dataConfidence: numberValue(record.dataConfidence),
    strategyTags: Array.isArray(record.strategyTags) ? record.strategyTags.filter((tag): tag is string => typeof tag === "string") : [],
  };
}

function parseKind(value: string): StorylineKind {
  if (value === "best" || value === "base" || value === "conservative" || value === "worst") return value;
  return "base";
}

function parseStatus(value: string): StorylineStatus {
  if (value === "new" || value === "unchanged" || value === "revised" || value === "invalidated") return value;
  return "new";
}

function jsonArrayOfStrings(value: Json): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
