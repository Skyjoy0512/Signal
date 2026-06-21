import { createClient } from "./server";
import type { Symbol, ForbiddenSymbol, MarketSnapshot, LayerCondition, Signal, LlmRun, AnalysisRun, ScoreSnapshot, StorylineScenarioRow, StorylineSetRow } from "./types";

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
