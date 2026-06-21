// Signal Database Types v0.3
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type AssetType = "jp_stock" | "us_stock" | "crypto";
export type SignalAction = "strong_entry_candidate" | "entry_candidate" | "watch" | "wait_for_pullback" | "avoid" | "take_profit_candidate" | "stop_exit_candidate";
export type SignalTier = "S" | "A" | "B" | "C" | "D";
export type TradeSide = "buy" | "sell";
export type PositionStatus = "open" | "closed" | "cancelled";
export type NotificationPriority = "critical" | "high" | "medium" | "low";

export interface Symbol { id: string; symbol: string; name: string | null; asset_type: AssetType; exchange: string | null; currency: string | null; sector: string | null; industry: string | null; country: string | null; is_active: boolean; created_at: string; updated_at: string; }
export interface UniverseMember { id: string; symbol_id: string; universe_type: string; source: string | null; is_enabled: boolean; created_at: string; }
export interface ForbiddenSymbol { id: string; symbol: string; asset_type: AssetType | null; exchange: string | null; reason: string; is_enabled: boolean; created_at: string; }
export interface MarketSnapshot {
  id: string; symbol_id: string; timeframe: string; captured_at: string;
  open: number | null; high: number | null; low: number | null; close: number | null; adjusted_close: number | null; volume: number | null;
  sma20: number | null; sma50: number | null; sma200: number | null; rsi14: number | null; atr14: number | null; atr20: number | null;
  volume_20d_avg: number | null; volume_ratio_20d: number | null; return_1d: number | null; return_5d: number | null; return_20d: number | null; return_60d: number | null;
  high_52w: number | null; low_52w: number | null; distance_from_52w_high_pct: number | null; drawdown_from_recent_high_pct: number | null; turnover: number | null; fundamentals_json: Json | null; catalyst_json: Json | null; raw_json: Json | null;
  data_confidence: number; data_confidence_reason: Json | null; created_at: string;
}
export interface LayerCondition { id: string; layer_name: string; inputs_json: Json | null; scope_key: string; timeframe: string; captured_at: string; condition: string; trend: string; strength: number; risk: number; confidence: number; impact: string; reason: string | null; data_confidence: number; created_at: string; }
export interface Signal { id: string; symbol_id: string; signal_type: string; action_suggestion: SignalAction; tier: SignalTier; opportunity_score: number; entry_timing_score: number; risk_score: number; conviction_score: number; final_entry_score: number; data_confidence: number; tier_reason: string | null; blocker_reason: string | null; strategy_tags_json: Json; strategy_fit_scores_json: Json; detected_at: string; status: string; created_at: string; updated_at: string; }
export interface TradeScenario { id: string; signal_id: string; entry_price: number; stop_price: number; target_base: number | null; risk_reward_base: number | null; created_at: string; }
export interface LlmRun { id: string; task_type: string; run_role: string; status: string; input_snapshot_json: Json; output_json: Json | null; input_tokens: number | null; output_tokens: number | null; estimated_cost: number | null; latency_ms: number | null; error_message: string | null; created_at: string; }
export interface LlmAnalysis { id: string; signal_id: string; action_suggestion: SignalAction | null; confidence: number | null; bull_case: string | null; bear_case: string | null; key_risks_json: Json | null; invalidation_condition: string | null; score_adjustments_json: Json | null; output_json: Json | null; created_at: string; }
export interface LineAlert { id: string; signal_id: string | null; priority: NotificationPriority; message: string; sent_at: string | null; delivery_status: string; user_action: string | null; created_at: string; }
export interface ManualPosition { id: string; symbol_id: string; status: PositionStatus; average_entry_price: number | null; quantity: number | null; stop_price: number | null; opened_at: string | null; closed_at: string | null; created_at: string; updated_at: string; }
export interface PaperTrade { id: string; signal_id: string; symbol_id: string; hypothetical_entry_price: number; stop_price: number | null; target_base: number | null; action_suggestion: SignalAction; created_at: string; }
export interface Outcome { id: string; signal_id: string | null; position_id: string | null; horizon: string; price_at_signal: number | null; price_at_review: number | null; return_pct: number | null; excess_return_pct: number | null; result_label: string | null; reviewed_at: string; created_at: string; }
export interface SystemHealthLog { id: string; job_type: string; status: string; error_message: string | null; metrics_json: Json | null; started_at: string | null; finished_at: string | null; created_at: string; }
