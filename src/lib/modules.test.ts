import { describe, it, expect } from "vitest";

// Notifications
import { NotificationBudgetManager } from "./notifications/budget";
import { buildMorningBrief, buildInstantAlert, buildWebhookReply } from "./notifications/templates";
import type { MorningBriefData, InstantAlertData } from "./notifications/types";

// Trades
import { calculatePositionPnl, summarizePosition } from "./trades/manual";
import { createPaperTrade } from "./trades/paper";

// Outcomes
import { evaluateOutcome, detectDueReviews, getReviewDate } from "./outcomes/tracker";

// Security
import { KillSwitch } from "./security/kill-switch";
import { generateExternalPack } from "./security/external-pack";
import { isForbidden, buildForbiddenCheck } from "./security/forbidden-symbols";

// =========================================
// Notification Budget
// =========================================
describe("NotificationBudgetManager", () => {
  it("allows sending within budget", () => {
    const mgr = new NotificationBudgetManager(5, 3600);
    expect(mgr.canSend("key1").allowed).toBe(true);
  });

  it("blocks after budget exhausted", () => {
    const mgr = new NotificationBudgetManager(2, 3600);
    mgr.recordSent("key1");
    mgr.recordSent("key2");
    expect(mgr.canSend("key3").allowed).toBe(false);
    expect(mgr.getBudget().exhausted).toBe(true);
  });

  it("enforces cooldown", () => {
    const mgr = new NotificationBudgetManager(10, 3600);
    const now = 1000000;
    mgr.recordSent("key1", now);
    // 30 minutes later — still in cooldown
    expect(mgr.canSend("key1", now + 1800 * 1000).allowed).toBe(false);
    // 2 hours later — cooldown passed
    expect(mgr.canSend("key1", now + 3600 * 1000 + 1).allowed).toBe(true);
  });

  it("resets daily counters", () => {
    const mgr = new NotificationBudgetManager(3, 3600);
    mgr.recordSent("a"); mgr.recordSent("b"); mgr.recordSent("c");
    expect(mgr.getBudget().exhausted).toBe(true);
    mgr.reset();
    expect(mgr.getBudget().exhausted).toBe(false);
    expect(mgr.getBudget().sentToday).toBe(0);
  });
});

// =========================================
// Templates
// =========================================
describe("notification templates", () => {
  it("builds morning brief", () => {
    const data: MorningBriefData = {
      date: "2024-06-27",
      marketCondition: "bullish",
      marketStrength: 68,
      strongSignals: [
        { symbol: "7203.T", name: "Toyota", tier: "A", action: "strong_entry_candidate",
          entryPrice: 3100, targetBase: 3400, stopPrice: 2950, rr: 2.0, keyReason: "強いトレンド" },
      ],
      entryCandidates: [
        { symbol: "6758.T", name: "Sony", tier: "B", action: "entry_candidate",
          entryPrice: 14000, rr: 1.8 },
      ],
      watchCount: 3,
      systemHealth: { dataFetched: true, errors: [] },
      dailyCostUsd: 0.12,
    };
    const msg = buildMorningBrief(data);
    expect(msg).toContain("Signal 朝まとめ");
    expect(msg).toContain("Toyota");
    expect(msg).toContain("bullish");
    expect(msg).toContain("Sony");
    expect(msg).toContain("Watch: 3件");
  });

  it("builds instant alert", () => {
    const data: InstantAlertData = {
      symbol: "7203.T", name: "Toyota", action: "strong_entry_candidate", tier: "A",
      entryPrice: 3100, stopPrice: 2950, targetBase: 3400, rr: 2.0,
      opportunityScore: 78, reason: "強い上昇トレンド", keyRisks: ["為替リスク"],
    };
    const msg = buildInstantAlert(data);
    expect(msg).toContain("Signal Strong Entry");
    expect(msg).toContain("Toyota");
    expect(msg).toContain("為替リスク");
  });

  it("builds webhook reply", () => {
    expect(buildWebhookReply("entered", "7203.T", "A")).toContain("記録しました");
    expect(buildWebhookReply("passed", "7203.T", "B")).toContain("見送り");
    expect(buildWebhookReply("deferred", "7203.T", "C")).toContain("保留");
  });
});

// =========================================
// Trades
// =========================================
describe("manual trades", () => {
  it("calculates position PnL correctly", () => {
    const result = calculatePositionPnl({
      entryPrice: 100, quantity: 100, currentPrice: 110, side: "buy",
    });
    expect(result.pnl).toBe(1000);
    expect(result.pnlPct).toBe(10);
  });

  it("calculates negative PnL", () => {
    const result = calculatePositionPnl({
      entryPrice: 100, quantity: 100, currentPrice: 95, side: "buy",
    });
    expect(result.pnl).toBe(-500);
    expect(result.pnlPct).toBe(-5);
  });

  it("summarizes position with PnL", () => {
    const summary = summarizePosition({
      id: "pos-1", symbolId: "sym-1", symbolName: "Test",
      status: "open", entryPrice: 5000, quantity: 10,
      currentPrice: 5200, openedAt: "2024-06-01",
    });
    expect(summary.unrealizedPnl).toBe(2000);
    expect(summary.unrealizedPnlPct).toBe(4);
  });
});

describe("paper trades", () => {
  it("creates paper trade", () => {
    const pt = createPaperTrade({
      signalId: "sig-1", symbolId: "sym-1", entryPrice: 3000,
      stopPrice: 2850, targetBase: 3300,
      actionSuggestion: "entry_candidate",
      strategyTags: ["breakout"],
    });
    expect(pt.entryPrice).toBe(3000);
    expect(pt.createdAt).toBeDefined();
  });
});

// =========================================
// Outcomes
// =========================================
describe("outcome tracker", () => {
  it("evaluates winning trade", () => {
    const result = evaluateOutcome({
      priceAtSignal: 100, priceAtReview: 115,
      maxFavorableExcursion: 120, maxAdverseExcursion: 98,
      benchmarkSymbol: "N225", benchmarkReturnPct: 5,
      reviewedAt: "2024-07-01",
      horizon: "1W",
    });
    expect(result.returnPct).toBe(15);
    expect(result.excessReturnPct).toBe(10);
    expect(result.mfe).toBe(20);
    expect(result.mae).toBe(-2);
    expect(result.resultLabel).toBe("strong_win");
  });

  it("evaluates losing trade", () => {
    const result = evaluateOutcome({
      priceAtSignal: 100, priceAtReview: 92,
      reviewedAt: "2024-07-01",
      horizon: "1W",
    });
    expect(result.returnPct).toBe(-8);
    expect(result.resultLabel).toBe("large_loss");
  });

  it("detects due reviews", () => {
    const openedAt = new Date();
    openedAt.setDate(openedAt.getDate() - 150);
    const due = detectDueReviews(openedAt.toISOString());
    expect(due.length).toBeGreaterThan(0);
    expect(due).toContain("1W");
    expect(due).toContain("1M");
  });

  it ("calculates review date", () => {
    const date = getReviewDate("2024-06-01", "1W");
    expect(date).toBe("2024-06-08");
  });
});

// =========================================
// Security / Kill Switch
// =========================================
describe("KillSwitch", () => {
  it("allows entries initially", () => {
    const ks = new KillSwitch();
    expect(ks.canEnter().allowed).toBe(true);
  });

  it("blocks after 3 consecutive losses", () => {
    const ks = new KillSwitch();
    ks.recordTrade({ pnl: -100, pnlPct: -1 });
    ks.recordTrade({ pnl: -200, pnlPct: -2 });
    const result = ks.recordTrade({ pnl: -50, pnlPct: -0.5 });
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("3連敗");
  });

  it("resets losses after a win", () => {
    const ks = new KillSwitch();
    ks.recordTrade({ pnl: -100, pnlPct: -1 });
    ks.recordTrade({ pnl: -200, pnlPct: -2 });
    ks.recordTrade({ pnl: 500, pnlPct: 5 });
    expect(ks.canEnter().allowed).toBe(true);
    expect(ks.getState().consecutiveLosses).toBe(0);
  });

  it("respects manual override", () => {
    const ks = new KillSwitch();
    ks.recordTrade({ pnl: -100, pnlPct: -1 });
    ks.recordTrade({ pnl: -200, pnlPct: -2 });
    ks.recordTrade({ pnl: -50, pnlPct: -0.5 });
    expect(ks.canEnter().allowed).toBe(false);
    ks.setManualOverride(true);
    expect(ks.canEnter().allowed).toBe(true);
  });

  it("resets daily", () => {
    const ks = new KillSwitch();
    ks.recordTrade({ pnl: -100, pnlPct: -1 });
    ks.recordTrade({ pnl: -200, pnlPct: -2 });
    ks.recordTrade({ pnl: -50, pnlPct: -0.5 });
    expect(ks.canEnter().allowed).toBe(false);
    ks.resetDaily();
    expect(ks.canEnter().allowed).toBe(true);
  });
});

// =========================================
// External Pack
// =========================================
describe("external analysis pack", () => {
  it("generates anonymized markdown", () => {
    const scored = {
      symbol: {
        id: "uuid-1", symbol: "7203.T", name: "Toyota",
        asset_type: "jp_stock" as const, exchange: "TSE",
        currency: "JPY", sector: "Transportation Equipment",
        industry: "Automobile", country: "JP",
        is_active: true, created_at: "", updated_at: "",
      },
      snapshot: {
        symbol: "7203.T", close: 3100,
        sma20: 3050, sma50: 2900, sma200: 2700,
        rsi14: 58, volumeRatio20d: 1.2,
        return5d: 3.5, return20d: 8.2,
        distanceFrom52wHighPct: -2, drawdownFromRecentHighPct: -1.5,
      },
      layer: null as any,
      scores: {
        opportunityScore: 72, entryTimingScore: 65,
        riskScore: 40, convictionScore: 70,
        finalEntryScore: 75,
        strategyFitScores: { breakout: 55, pullback: 62, reversal: 45, trend_follow: 68 },
        strategyTags: ["trend_follow"],
        breakdown: {
          opportunity: { trend: 75, volume: 65, relativeStrength: 60, theme: 60, fundamental: 50, catalyst: 50 },
          entryTiming: { setup: 65, rsiPosition: 60, atrPosition: 55, supportResistance: 60, priceAction: 60 },
          risk: { volatility: 45, liquidity: 40, event: 50, market: 45, sector: 45, data: 35 },
          conviction: { dataConfidence: 85, multiLayerAlignment: 70, technicalConfirmation: 70, fundamentalConfirmation: 50, llmConfidence: 50 },
        },
      } as any,
      classification: {
        action: "entry_candidate" as const, tier: "B" as const,
        tierReason: "entry gates passed",
        gates: {} as any,
        scenario: {
          entryPrice: 3100, stopPrice: 2950,
          targetConservative: 3150, targetBase: 3300, targetBull: 3500,
          upsideConservativePct: 1.6, upsideBasePct: 6.5, upsideBullPct: 12.9,
          downsidePct: -4.8, riskRewardBase: 1.35,
          expectedHoldingPeriod: "2W", calculationMethod: "atr_v1",
        },
      },
    };

    const pack = generateExternalPack(scored, null, { anonymize: true });
    expect(pack).toContain("Signal One-shot External Analysis Pack");
    expect(pack).toContain("Anonymized");
    expect(pack).toContain("Transportation Equipment");
    expect(pack).not.toContain("Toyota");
    expect(pack).not.toContain("7203.T");
  });

  it("includes scores when not anonymized", () => {
    const scored = {
      symbol: {
        id: "uuid-1", symbol: "6758.T", name: "Sony",
        asset_type: "jp_stock" as const, exchange: "TSE",
        currency: "JPY", sector: "Electric Appliances",
        industry: "Consumer Electronics", country: "JP",
        is_active: true, created_at: "", updated_at: "",
      },
      snapshot: {
        symbol: "6758.T", close: 14000,
        sma20: 13800, sma50: 13500, sma200: null,
        rsi14: 55, volumeRatio20d: 1.0,
        return5d: 2.0, return20d: 5.0,
        distanceFrom52wHighPct: -5, drawdownFromRecentHighPct: -3,
      },
      layer: null as any,
      scores: {
        opportunityScore: 65, entryTimingScore: 60,
        riskScore: 50, convictionScore: 55,
        finalEntryScore: 62,
        strategyFitScores: { breakout: 50, pullback: 55, reversal: 45, trend_follow: 55 },
        strategyTags: ["pullback"],
        breakdown: {
          opportunity: { trend: 60, volume: 50, relativeStrength: 45, theme: 50, fundamental: 50, catalyst: 50 },
          entryTiming: { setup: 55, rsiPosition: 55, atrPosition: 50, supportResistance: 50, priceAction: 50 },
          risk: { volatility: 50, liquidity: 50, event: 50, market: 50, sector: 50, data: 50 },
          conviction: { dataConfidence: 70, multiLayerAlignment: 50, technicalConfirmation: 50, fundamentalConfirmation: 50, llmConfidence: 50 },
        },
      } as any,
      classification: {
        action: "watch" as const, tier: "C" as const,
        tierReason: "below entry threshold",
        gates: {} as any,
        scenario: null,
      },
    };

    const pack = generateExternalPack(scored, null, { anonymize: false });
    expect(pack).toContain("Sony");
    expect(pack).toContain("6758.T");
  });
});

// =========================================
// Forbidden Symbols
// =========================================
describe("forbidden symbols", () => {
  it("detects forbidden symbol", () => {
    const list = [buildForbiddenCheck({ symbol: "9999.T", reason: "上場廃止予定" })];
    const result = isForbidden("9999.T", list);
    expect(result).not.toBeNull();
    expect(result!.reason).toContain("上場廃止");
  });

  it("allows non-forbidden symbol", () => {
    const list = [buildForbiddenCheck({ symbol: "9999.T", reason: "上場廃止" })];
    expect(isForbidden("7203.T", list)).toBeNull();
  });
});
