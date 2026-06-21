import type { NotificationPriority, LineAlertInput } from "./types";
import type { MorningBriefData, InstantAlertData } from "./types";
import { LineClient } from "./line-client";
import { NotificationBudgetManager } from "./budget";
import { buildMorningBrief, buildInstantAlert } from "./templates";

/**
 * Notification Engine — coordinates LINE messaging with budget and cooldown.
 */
export class NotificationEngine {
  private lineClient: LineClient;
  private budget: NotificationBudgetManager;

  constructor(maxPerDay?: number, cooldownSeconds?: number) {
    this.lineClient = new LineClient();
    this.budget = new NotificationBudgetManager(maxPerDay, cooldownSeconds);
  }

  get budgetManager(): NotificationBudgetManager {
    return this.budget;
  }

  get isConfigured(): boolean {
    return this.lineClient.isConfigured;
  }

  /**
   * Send the morning brief.
   */
  async sendMorningBrief(data: MorningBriefData): Promise<{ success: boolean; error?: string }> {
    const key = `morning_brief:${data.date}`;

    const check = this.budget.canSend(key);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    const message = buildMorningBrief(data);

    // Morning brief can be long — use push message
    const result = await this.lineClient.sendMessage(message);
    if (result.success) {
      this.budget.recordSent(key);
    }
    return result;
  }

  /**
   * Send an instant alert for a strong/new signal.
   */
  async sendInstantAlert(
    data: InstantAlertData,
    priority: NotificationPriority = "high",
  ): Promise<{ success: boolean; error?: string }> {
    const key = `instant:${data.symbol}:${data.action}`;

    const check = this.budget.canSend(key);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    const message = buildInstantAlert(data);
    const result = await this.lineClient.sendMessage(message);
    if (result.success) {
      this.budget.recordSent(key);
    }
    return result;
  }

  /**
   * Queue alert for DB storage (to be sent by a companion process).
   */
  buildAlert(input: LineAlertInput): LineAlertInput & { cooldownKey: string } {
    return {
      ...input,
      cooldownKey: input.signalId ? `signal:${input.signalId}` : `alert:${Date.now()}`,
    };
  }

  /**
   * Reset daily budget at start of new day.
   */
  resetDaily(): void {
    this.budget.reset();
  }
}
