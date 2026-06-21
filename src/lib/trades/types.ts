import type { SignalAction, TradeSide, PositionStatus } from "../supabase/types";

export interface ManualPositionInput {
  symbolId: string;
  sourceSignalId?: string | null;
  entryPrice: number;
  quantity: number;
  stopPrice?: number | null;
  takeProfitPrice?: number | null;
  thesis?: string;
}

export interface ManualExecutionInput {
  positionId: string;
  side: TradeSide;
  price: number;
  quantity: number;
  fee?: number;
  executedAt: string;
  reason?: string;
  memo?: string;
  emotionTags?: string[];
}

export interface PaperTradeInput {
  signalId: string;
  symbolId: string;
  entryPrice: number;
  stopPrice?: number | null;
  targetBase?: number | null;
  actionSuggestion: SignalAction;
  strategyTags?: string[];
}

export interface PositionSummary {
  id: string;
  symbolId: string;
  symbolName: string;
  status: PositionStatus;
  entryPrice: number;
  currentPrice?: number;
  quantity: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  unrealizedPnl?: number;
  unrealizedPnlPct?: number;
  openedAt: string;
}
