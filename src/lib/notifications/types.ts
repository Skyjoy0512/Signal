export type NotificationPriority = "critical" | "high" | "medium" | "low";
export type DeliveryStatus = "pending" | "sent" | "delivered" | "failed" | "rate_limited";
export type UserAction = "acknowledged" | "entered" | "passed" | "deferred" | "ignored";

export interface LineAlertInput {
  signalId?: string | null;
  priority: NotificationPriority;
  message: string;
}

export interface NotificationBudget {
  maxPerDay: number;
  sentToday: number;
  remaining: number;
  exhausted: boolean;
}

export interface CooldownState {
  cooldownSeconds: number;
  lastSent: Record<string, number>;
}

export interface MorningBriefData {
  date: string;
  marketCondition: string;
  marketStrength: number;
  strongSignals: Array<{
    symbol: string; name: string; tier: string; action: string;
    entryPrice: number; targetBase: number; stopPrice: number;
    rr: number; keyReason: string;
  }>;
  entryCandidates: Array<{
    symbol: string; name: string; tier: string; action: string;
    entryPrice: number; rr: number;
  }>;
  watchCount: number;
  systemHealth: { dataFetched: boolean; errors: string[] };
  dailyCostUsd: number;
}

export interface InstantAlertData {
  symbol: string; name: string; action: string; tier: string;
  entryPrice: number; stopPrice: number; targetBase: number;
  rr: number; opportunityScore: number; reason: string; keyRisks: string[];
}
