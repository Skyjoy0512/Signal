import { createClient } from "./server";
import type {
  Symbol,
  ForbiddenSymbol,
  MarketSnapshot,
  LayerCondition,
  Signal,
  LlmRun,
  AnalysisRun,
  ScoreSnapshot,
  StorylineScenarioRow,
  StorylineSetRow,
  PriceObservation,
  SignalOutcome,
  StorylineOutcome,
  StorylineRevision,
  UserDecision,
  ReviewEvent,
  DataQualityObservation,
} from "./types";

type MarketSnapshotPartial = Partial<MarketSnapshot> & { symbol_id: string; timeframe: string; captured_at: string; data_confidence: number };

export async function getEnabledUniverse(universeType?: string): Promise<Symbol[]> {
  const supabase = await createClient();
  let query = supabase.from("universe_members").select("symbols(*)").eq("is_enabled", true);
  if (universeType) query = query.eq("universe_type", universeType);
  const { data, error } = await query;
  if (error) throw new Error(`getEnabledUniverse: ${error.message}`);
  const seen = new Set<string>();
  const symbols: Symbol[] = [];
  for (const row of data) {
    const sym = (row as unknown as { symbols: Symbol }).symbols;
    if (sym && !seen.has(sym.id)) { seen.add(sym.id); symbols.push(sym); }
  }
  return symbols;
}

export async function getForbiddenSymbols(): Promise<ForbiddenSymbol[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("forbidden_symbols").select("*").eq("is_enabled", true);
  if (error) throw new Error(`getForbiddenSymbols: ${error.message}`);
  return data as ForbiddenSymbol[];
}

export async function getActiveEvents(symbolIds: string[], date: string): Promise<Array<{ symbol_id: string; impact_level: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events_calendar").select("symbol_id, impact_level").in("symbol_id", symbolIds).lte("blocker_start", date).gte("blocker_end", date);
  if (error) return [];
  return (data ?? []) as Array<{ symbol_id: string; impact_level: string }>;
}

export async function insertMarketSnapshots(snapshots: MarketSnapshotPartial[]): Promise<void> {
  if (snapshots.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("market_snapshots").upsert(snapshots, { onConflict: "symbol_id, timeframe, captured_at" });
  if (error) throw new Error(`insertMarketSnapshots: ${error.message}`);
}

export async function insertLayerConditions(conditions: Array<Omit<LayerCondition, "id" | "created_at">>): Promise<void> {
  if (conditions.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("layer_conditions").upsert(conditions, { onConflict: "layer_name, scope_key, timeframe, captured_at" });
  if (error) throw new Error(`insertLayerConditions: ${error.message}`);
}

export async function insertSignal(input: Omit<Signal, "id" | "created_at" | "updated_at">): Promise<Signal> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("signals").insert(input).select().single();
  if (error) throw new Error(`insertSignal: ${error.message}`);
  return data as Signal;
}

export async function insertTradeScenario(input: { signal_id: string; entry_price: number; stop_price: number; target_base?: number | null; risk_reward_base?: number | null }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("trade_scenarios").upsert(input, { onConflict: "signal_id" });
  if (error) throw new Error(`insertTradeScenario: ${error.message}`);
}

export async function insertLlmRun(input: Omit<LlmRun, "id" | "created_at">): Promise<LlmRun> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("llm_runs").insert(input).select().single();
  if (error) throw new Error(`insertLlmRun: ${error.message}`);
  return data as LlmRun;
}

export async function insertAnalysisRun(input: Omit<AnalysisRun, "id" | "created_at">): Promise<AnalysisRun> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("analysis_runs").insert(input).select().single();
  if (error) throw new Error(`insertAnalysisRun: ${error.message}`);
  return data as AnalysisRun;
}

export async function insertScoreSnapshot(input: Omit<ScoreSnapshot, "id" | "created_at">): Promise<ScoreSnapshot> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("score_snapshots").insert(input).select().single();
  if (error) throw new Error(`insertScoreSnapshot: ${error.message}`);
  return data as ScoreSnapshot;
}

export async function getLatestStorylineSet(symbol: string): Promise<StorylineSetRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("storyline_sets").select("*").eq("symbol", symbol).order("generated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`getLatestStorylineSet: ${error.message}`);
  return (data as StorylineSetRow | null) ?? null;
}

export async function getStorylineHistory(input: { symbol?: string; limit?: number } = {}): Promise<Array<{ set: StorylineSetRow; scenarios: StorylineScenarioRow[] }>> {
  const supabase = await createClient();
  let query = supabase.from("storyline_sets").select("*").order("generated_at", { ascending: false }).limit(input.limit ?? 20);
  if (input.symbol) query = query.eq("symbol", input.symbol);
  const { data, error } = await query;
  if (error) throw new Error(`getStorylineHistory: ${error.message}`);
  const sets = (data ?? []) as StorylineSetRow[];
  if (sets.length === 0) return [];
  const ids = sets.map((set) => set.id);
  const { data: scenarioData, error: scenarioError } = await supabase.from("storyline_scenarios").select("*").in("storyline_set_id", ids);
  if (scenarioError) throw new Error(`getStorylineHistory scenarios: ${scenarioError.message}`);
  const scenarios = (scenarioData ?? []) as StorylineScenarioRow[];
  return sets.map((set) => ({
    set,
    scenarios: scenarios
      .filter((scenario) => scenario.storyline_set_id === set.id)
      .sort((a, b) => scenarioOrder(a.scenario_kind) - scenarioOrder(b.scenario_kind)),
  }));
}

export async function insertStorylineSet(input: Omit<StorylineSetRow, "id" | "created_at">): Promise<StorylineSetRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("storyline_sets").insert(input).select().single();
  if (error) throw new Error(`insertStorylineSet: ${error.message}`);
  return data as StorylineSetRow;
}

export async function insertStorylineScenarios(input: Array<Omit<StorylineScenarioRow, "id" | "created_at">>): Promise<void> {
  if (input.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("storyline_scenarios").insert(input);
  if (error) throw new Error(`insertStorylineScenarios: ${error.message}`);
}

export async function insertPriceObservation(input: Omit<PriceObservation, "id" | "created_at">): Promise<PriceObservation> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("price_observations").upsert(input, { onConflict: "symbol_id,timeframe,observed_at,source" }).select().single();
  if (error) throw new Error(`insertPriceObservation: ${error.message}`);
  return data as PriceObservation;
}

export async function getPriceObservations(input: { symbol: string; timeframe?: string; limit?: number }): Promise<PriceObservation[]> {
  const supabase = await createClient();
  let query = supabase.from("price_observations").select("*").eq("symbol", input.symbol).order("observed_at", { ascending: false }).limit(input.limit ?? 100);
  if (input.timeframe) query = query.eq("timeframe", input.timeframe);
  const { data, error } = await query;
  if (error) throw new Error(`getPriceObservations: ${error.message}`);
  return (data ?? []) as PriceObservation[];
}

export async function insertSignalOutcome(input: Omit<SignalOutcome, "id" | "created_at">): Promise<SignalOutcome> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("signal_outcomes").insert(input).select().single();
  if (error) throw new Error(`insertSignalOutcome: ${error.message}`);
  return data as SignalOutcome;
}

export async function getSignalOutcomes(input: { scoreSnapshotId?: string; analysisRunId?: string; symbolId?: string; horizon?: string; limit?: number } = {}): Promise<SignalOutcome[]> {
  const supabase = await createClient();
  let query = supabase.from("signal_outcomes").select("*").order("created_at", { ascending: false }).limit(input.limit ?? 100);
  if (input.scoreSnapshotId) query = query.eq("score_snapshot_id", input.scoreSnapshotId);
  if (input.analysisRunId) query = query.eq("analysis_run_id", input.analysisRunId);
  if (input.symbolId) query = query.eq("symbol_id", input.symbolId);
  if (input.horizon) query = query.eq("horizon", input.horizon);
  const { data, error } = await query;
  if (error) throw new Error(`getSignalOutcomes: ${error.message}`);
  return (data ?? []) as SignalOutcome[];
}

export async function insertStorylineOutcome(input: Omit<StorylineOutcome, "id" | "created_at">): Promise<StorylineOutcome> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("storyline_outcomes").insert(input).select().single();
  if (error) throw new Error(`insertStorylineOutcome: ${error.message}`);
  return data as StorylineOutcome;
}

export async function getStorylineOutcomes(input: { storylineSetId?: string; symbolId?: string; horizon?: string; limit?: number } = {}): Promise<StorylineOutcome[]> {
  const supabase = await createClient();
  let query = supabase.from("storyline_outcomes").select("*").order("created_at", { ascending: false }).limit(input.limit ?? 100);
  if (input.storylineSetId) query = query.eq("storyline_set_id", input.storylineSetId);
  if (input.symbolId) query = query.eq("symbol_id", input.symbolId);
  if (input.horizon) query = query.eq("horizon", input.horizon);
  const { data, error } = await query;
  if (error) throw new Error(`getStorylineOutcomes: ${error.message}`);
  return (data ?? []) as StorylineOutcome[];
}

export async function insertStorylineRevision(input: Omit<StorylineRevision, "id" | "created_at">): Promise<StorylineRevision> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("storyline_revisions").insert(input).select().single();
  if (error) throw new Error(`insertStorylineRevision: ${error.message}`);
  return data as StorylineRevision;
}

export async function getStorylineRevisions(input: { symbolId?: string; limit?: number } = {}): Promise<StorylineRevision[]> {
  const supabase = await createClient();
  let query = supabase.from("storyline_revisions").select("*").order("created_at", { ascending: false }).limit(input.limit ?? 100);
  if (input.symbolId) query = query.eq("symbol_id", input.symbolId);
  const { data, error } = await query;
  if (error) throw new Error(`getStorylineRevisions: ${error.message}`);
  return (data ?? []) as StorylineRevision[];
}

export async function insertUserDecision(input: Omit<UserDecision, "id" | "created_at">): Promise<UserDecision> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_decisions").insert(input).select().single();
  if (error) throw new Error(`insertUserDecision: ${error.message}`);
  return data as UserDecision;
}

export async function getUserDecisions(input: { symbolId?: string; scoreSnapshotId?: string; limit?: number } = {}): Promise<UserDecision[]> {
  const supabase = await createClient();
  let query = supabase.from("user_decisions").select("*").order("created_at", { ascending: false }).limit(input.limit ?? 100);
  if (input.symbolId) query = query.eq("symbol_id", input.symbolId);
  if (input.scoreSnapshotId) query = query.eq("score_snapshot_id", input.scoreSnapshotId);
  const { data, error } = await query;
  if (error) throw new Error(`getUserDecisions: ${error.message}`);
  return (data ?? []) as UserDecision[];
}

export async function insertReviewEvent(input: Omit<ReviewEvent, "id" | "created_at">): Promise<ReviewEvent> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("review_events").insert(input).select().single();
  if (error) throw new Error(`insertReviewEvent: ${error.message}`);
  return data as ReviewEvent;
}

export async function getReviewEvents(input: { symbolId?: string; eventType?: string; unresolvedOnly?: boolean; limit?: number } = {}): Promise<ReviewEvent[]> {
  const supabase = await createClient();
  let query = supabase.from("review_events").select("*").order("created_at", { ascending: false }).limit(input.limit ?? 100);
  if (input.symbolId) query = query.eq("symbol_id", input.symbolId);
  if (input.eventType) query = query.eq("event_type", input.eventType);
  if (input.unresolvedOnly) query = query.is("resolved_at", null);
  const { data, error } = await query;
  if (error) throw new Error(`getReviewEvents: ${error.message}`);
  return (data ?? []) as ReviewEvent[];
}

export async function insertDataQualityObservation(input: Omit<DataQualityObservation, "id" | "created_at">): Promise<DataQualityObservation> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("data_quality_observations").insert(input).select().single();
  if (error) throw new Error(`insertDataQualityObservation: ${error.message}`);
  return data as DataQualityObservation;
}

export async function getDataQualityObservations(input: { symbolId?: string; dataset?: string; limit?: number } = {}): Promise<DataQualityObservation[]> {
  const supabase = await createClient();
  let query = supabase.from("data_quality_observations").select("*").order("as_of", { ascending: false }).limit(input.limit ?? 100);
  if (input.symbolId) query = query.eq("symbol_id", input.symbolId);
  if (input.dataset) query = query.eq("dataset", input.dataset);
  const { data, error } = await query;
  if (error) throw new Error(`getDataQualityObservations: ${error.message}`);
  return (data ?? []) as DataQualityObservation[];
}

function scenarioOrder(kind: string): number {
  if (kind === "best") return 0;
  if (kind === "base") return 1;
  if (kind === "conservative") return 2;
  if (kind === "worst") return 3;
  return 99;
}

export async function logSystemHealth(input: { jobType: string; status: string; errorMessage?: string; metrics?: Record<string, unknown>; startedAt?: string; finishedAt?: string }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("system_health_logs").insert({
    job_type: input.jobType, status: input.status,
    error_message: input.errorMessage ?? null, metrics_json: input.metrics ?? null,
    started_at: input.startedAt ?? null, finished_at: input.finishedAt ?? null,
  });
  if (error) throw new Error(`logSystemHealth: ${error.message}`);
}
