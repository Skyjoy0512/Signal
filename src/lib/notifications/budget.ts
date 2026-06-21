import type { NotificationBudget, CooldownState, NotificationPriority } from "./types";

/**
 * Notification Budget Manager — enforces daily limits and per-symbol cooldowns.
 *
 * Budget is reset daily. Cooldown prevents spamming the same symbol within a window.
 */

export class NotificationBudgetManager {
  private budget: NotificationBudget;
  private cooldown: CooldownState;
  private dailyCostUsd: number;

  constructor(maxPerDay: number = 10, cooldownSeconds: number = 3600) {
    this.budget = {
      maxPerDay,
      sentToday: 0,
      remaining: maxPerDay,
      exhausted: false,
    };
    this.cooldown = {
      cooldownSeconds,
      lastSent: {},
    };
    this.dailyCostUsd = 0;
  }

  /**
   * Check if a notification can be sent for the given key (e.g. "7203.T:strong_entry").
   */
  canSend(key: string, now: number = Date.now()): { allowed: boolean; reason?: string } {
    // Budget check
    if (this.budget.exhausted) {
      return { allowed: false, reason: "daily budget exhausted" };
    }

    // Cooldown check
    const lastSent = this.cooldown.lastSent[key];
    if (lastSent) {
      const elapsed = (now - lastSent) / 1000;
      if (elapsed < this.cooldown.cooldownSeconds) {
        const remaining = Math.round(this.cooldown.cooldownSeconds - elapsed);
        return { allowed: false, reason: `cooldown: ${remaining}s remaining` };
      }
    }

    return { allowed: true };
  }

  /**
   * Record a sent notification.
   */
  recordSent(key: string, now: number = Date.now()): void {
    this.budget.sentToday++;
    this.budget.remaining = Math.max(0, this.budget.maxPerDay - this.budget.sentToday);
    this.budget.exhausted = this.budget.remaining <= 0;
    this.cooldown.lastSent[key] = now;
  }

  /**
   * Track LLM cost for the day.
   */
  addCost(usd: number): void {
    this.dailyCostUsd += usd;
  }

  /**
   * Reset the daily budget (called at start of new day).
   */
  reset(): void {
    this.budget.sentToday = 0;
    this.budget.remaining = this.budget.maxPerDay;
    this.budget.exhausted = false;
    this.cooldown.lastSent = {};
    this.dailyCostUsd = 0;
  }

  getBudget(): NotificationBudget {
    return { ...this.budget };
  }

  getCost(): number {
    return this.dailyCostUsd;
  }

  getCooldownState(): CooldownState {
    return {
      cooldownSeconds: this.cooldown.cooldownSeconds,
      lastSent: { ...this.cooldown.lastSent },
    };
  }

  /**
   * Priority-based sort: critical > high > medium > low, then by recency.
   * Used to select which notifications to send when budget is tight.
   */
  static priorityRank(p: NotificationPriority): number {
    switch (p) {
      case "critical": return 0;
      case "high": return 1;
      case "medium": return 2;
      case "low": return 3;
    }
  }
}
