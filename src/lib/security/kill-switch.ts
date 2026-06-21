/**
 * Signal Kill Switch - risk management safety net.
 *
 * Rules:
 * - 3 consecutive losses → propose "No New Entry"
 * - 5 consecutive losses → block all new entries
 * - Daily loss exceeds threshold → block new entries for rest of day
 * - Manual override available via user_settings
 */

export interface KillSwitchState {
  /** Whether new entries are currently blocked. */
  noNewEntries: boolean;
  /** Reason for the block. */
  reason: string | null;
  /** Consecutive losing trades. */
  consecutiveLosses: number;
  /** Total realized loss today (in account currency). */
  dailyRealizedLoss: number;
  /** Daily loss threshold that triggers a block. */
  dailyLossThreshold: number;
  /** Maximum consecutive losses before blocking. */
  maxConsecutiveLosses: number;
  /** Manual override from user settings. */
  manualOverride: boolean;
}

const DEFAULT_STATE: KillSwitchState = {
  noNewEntries: false,
  reason: null,
  consecutiveLosses: 0,
  dailyRealizedLoss: 0,
  dailyLossThreshold: 0, // 0 = unused (set via config)
  maxConsecutiveLosses: 3, // 3連敗で警告
  manualOverride: false,
};

export class KillSwitch {
  private state: KillSwitchState;

  constructor(initial?: Partial<KillSwitchState>) {
    this.state = { ...DEFAULT_STATE, ...initial };
  }

  /**
   * Record a trade result. Returns true if new entries are now blocked.
   */
  recordTrade(result: { pnl: number; pnlPct: number }): { blocked: boolean; reason?: string } {
    if (result.pnl < 0) {
      this.state.consecutiveLosses++;
      this.state.dailyRealizedLoss += Math.abs(result.pnl);
    } else {
      this.state.consecutiveLosses = 0;
    }

    // Check thresholds
    if (this.state.manualOverride) {
      return { blocked: false };
    }

    // 5 consecutive losses → hard block
    if (this.state.consecutiveLosses >= 5) {
      this.state.noNewEntries = true;
      this.state.reason = `5連敗のため新規エントリーをブロックします (連敗数: ${this.state.consecutiveLosses})`;
      return { blocked: true, reason: this.state.reason };
    }

    // 3 consecutive losses → warning (propose no new entry)
    if (this.state.consecutiveLosses >= 3) {
      this.state.noNewEntries = true;
      this.state.reason = `3連敗のため新規エントリー見送りを提案します (連敗数: ${this.state.consecutiveLosses})`;
      return { blocked: true, reason: this.state.reason };
    }

    // Daily loss threshold
    if (
      this.state.dailyLossThreshold > 0 &&
      this.state.dailyRealizedLoss >= this.state.dailyLossThreshold
    ) {
      this.state.noNewEntries = true;
      this.state.reason = `本日の損失が閾値 (${this.state.dailyLossThreshold}) を超えたため新規エントリーをブロックします`;
      return { blocked: true, reason: this.state.reason };
    }

    this.state.noNewEntries = false;
    this.state.reason = null;
    return { blocked: false };
  }

  /**
   * Check if new entries are currently allowed.
   */
  canEnter(): { allowed: boolean; reason?: string } {
    if (this.state.manualOverride) return { allowed: true };
    if (this.state.noNewEntries) {
      return { allowed: false, reason: this.state.reason ?? "Kill switch active" };
    }
    return { allowed: true };
  }

  /**
   * Manually override the kill switch (user action).
   */
  setManualOverride(enabled: boolean): void {
    this.state.manualOverride = enabled;
    if (enabled) {
      this.state.noNewEntries = false;
      this.state.reason = null;
    }
  }

  /**
   * Reset daily counters (called at start of new day).
   */
  resetDaily(): void {
    this.state.consecutiveLosses = 0;
    this.state.dailyRealizedLoss = 0;
    this.state.noNewEntries = false;
    this.state.reason = null;
  }

  getState(): Readonly<KillSwitchState> {
    return { ...this.state };
  }
}
