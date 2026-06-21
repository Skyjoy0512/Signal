import type { ManualPositionInput, ManualExecutionInput, PositionSummary } from "./types";

/**
 * Manual Trade Engine — entry, exit, P&L calculation.
 */
export function createPosition(input: ManualPositionInput): Omit<ManualPositionInput, never> & {
  status: "open";
  openedAt: string;
  thesisHistory: string[];
} {
  return {
    ...input,
    status: "open" as const,
    openedAt: new Date().toISOString(),
    thesisHistory: input.thesis ? [input.thesis] : [],
  };
}

export function createExecution(input: ManualExecutionInput): ManualExecutionInput {
  return input;
}

export function calculatePositionPnl(params: {
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  side: "buy" | "sell";
}): { pnl: number; pnlPct: number } {
  const { entryPrice, quantity, currentPrice, side } = params;
  const multiplier = side === "buy" ? 1 : -1;
  const pnl = (currentPrice - entryPrice) * quantity * multiplier;
  const pnlPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 * multiplier : 0;
  return { pnl: Math.round(pnl * 100) / 100, pnlPct: Math.round(pnlPct * 100) / 100 };
}

export function summarizePosition(params: {
  id: string;
  symbolId: string;
  symbolName: string;
  status: "open" | "closed";
  entryPrice: number;
  quantity: number;
  currentPrice?: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  openedAt: string;
}): PositionSummary {
  const { currentPrice, entryPrice, quantity } = params;
  const pnl = currentPrice
    ? calculatePositionPnl({ entryPrice, quantity, currentPrice, side: "buy" })
    : undefined;

  return {
    id: params.id,
    symbolId: params.symbolId,
    symbolName: params.symbolName,
    status: params.status,
    entryPrice: params.entryPrice,
    currentPrice,
    quantity: params.quantity,
    stopPrice: params.stopPrice,
    takeProfitPrice: params.takeProfitPrice,
    unrealizedPnl: pnl?.pnl,
    unrealizedPnlPct: pnl?.pnlPct,
    openedAt: params.openedAt,
  };
}
