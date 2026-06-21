import { createClient } from "./server";
import type { Symbol, ForbiddenSymbol, MarketSnapshot, LayerCondition, Signal, LlmRun, LlmAnalysis, LineAlert } from "./types";

type MarketSnapshotPartial = Partial<MarketSnapshot> & { symbol_id: string; timeframe: string; captured_at: string; data_confidence: number };

export async function getEnabledUniverse(): Promise<Symbol[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("universe_members").select("symbols(*)").eq("is_enabled", true);
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

export async function logSystemHealth(input: { jobType: string; status: string; errorMessage?: string; metrics?: Record<string, unknown>; startedAt?: string; finishedAt?: string }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("system_health_logs").insert({
    job_type: input.jobType, status: input.status,
    error_message: input.errorMessage ?? null, metrics_json: input.metrics ?? null,
    started_at: input.startedAt ?? null, finished_at: input.finishedAt ?? null,
  });
  if (error) throw new Error(`logSystemHealth: ${error.message}`);
}
