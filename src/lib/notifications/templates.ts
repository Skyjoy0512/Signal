import type { MorningBriefData, InstantAlertData } from "./types";

/**
 * Message templates for Signal LINE notifications.
 * All messages are in Japanese.
 */

export function buildMorningBrief(data: MorningBriefData): string {
  const lines: string[] = [];

  lines.push(`☀️ Signal 朝まとめ ${data.date}`);
  lines.push("");

  // Market header
  const marketEmoji =
    data.marketCondition === "strong_bullish" ? "🟢" :
    data.marketCondition === "bullish" ? "🟡" :
    data.marketCondition === "bearish" ? "🟠" :
    data.marketCondition === "strong_bearish" ? "🔴" : "⚪";

  lines.push(`${marketEmoji} 地合い: ${data.marketCondition} (strength: ${data.marketStrength})`);
  lines.push("");

  // Strong signals
  if (data.strongSignals.length > 0) {
    lines.push("🔥 Strong Entry Candidates");
    for (const s of data.strongSignals.slice(0, 3)) {
      const tierIcon = s.tier === "S" ? "⭐" : s.tier === "A" ? "🔶" : "🔹";
      lines.push(`${tierIcon} ${s.name} (${s.symbol}) [${s.tier}]`);
      lines.push(`   Entry: ${s.entryPrice.toLocaleString()} | Target: ${s.targetBase.toLocaleString()} | Stop: ${s.stopPrice.toLocaleString()}`);
      lines.push(`   RR: ${s.rr.toFixed(1)} | ${s.keyReason}`);
    }
    if (data.strongSignals.length > 3) {
      lines.push(`   ...他 ${data.strongSignals.length - 3} 件`);
    }
    lines.push("");
  }

  // Entry candidates
  if (data.entryCandidates.length > 0) {
    lines.push(`📊 Entry Candidates (${data.entryCandidates.length}件)`);
    for (const c of data.entryCandidates.slice(0, 5)) {
      lines.push(`・${c.name} (${c.symbol}) [${c.tier}] Entry: ${c.entryPrice.toLocaleString()} RR: ${c.rr.toFixed(1)}`);
    }
    if (data.entryCandidates.length > 5) {
      lines.push(`   ...他 ${data.entryCandidates.length - 5} 件`);
    }
    lines.push("");
  }

  // Watch count
  if (data.watchCount > 0) {
    lines.push(`👀 Watch: ${data.watchCount}件`);
    lines.push("");
  }

  // System health
  const healthIcon = data.systemHealth.errors.length === 0 ? "✅" : "⚠️";
  lines.push(`${healthIcon} System Health`);
  if (!data.systemHealth.dataFetched) {
    lines.push("   ⚠️ データ取得に問題がありました");
  }
  for (const err of data.systemHealth.errors.slice(0, 2)) {
    lines.push(`   ⚠️ ${err}`);
  }
  lines.push(`   Cost: $${data.dailyCostUsd.toFixed(3)}`);

  return lines.join("\n");
}

export function buildInstantAlert(data: InstantAlertData): string {
  const lines: string[] = [];
  const tierIcon = data.tier === "S" ? "⭐" : data.tier === "A" ? "🔶" : "🔹";

  const actionLabel =
    data.action === "strong_entry_candidate" ? "Strong Entry" :
    data.action === "entry_candidate" ? "Entry Candidate" :
    data.action === "watch" ? "Watch" : "Avoid";

  lines.push(`${tierIcon} Signal ${actionLabel}`);
  lines.push("");
  lines.push(`銘柄: ${data.name} (${data.symbol})`);
  lines.push(`Entry: ${data.entryPrice.toLocaleString()} | Target: ${data.targetBase.toLocaleString()} | Stop: ${data.stopPrice.toLocaleString()}`);
  lines.push(`RR: ${data.rr.toFixed(1)} | Score: ${data.opportunityScore}`);
  lines.push("");
  lines.push(`理由: ${data.reason}`);
  if (data.keyRisks.length > 0) {
    lines.push(`リスク: ${data.keyRisks.slice(0, 3).join(" / ")}`);
  }

  return lines.join("\n");
}

export function buildWebhookReply(action: string, symbol: string, tier: string): string {
  switch (action) {
    case "entered":
      return `✅ ${symbol} [${tier}] Entryを記録しました。`;
    case "passed":
      return `⏭️ ${symbol} [${tier}] 見送りました。`;
    case "deferred":
      return `⏳ ${symbol} [${tier}] 保留にしました。`;
    default:
      return `📝 ${symbol} [${tier}] アクションを受け付けました。`;
  }
}
