import type { ScoredSymbol } from "../jobs/types";
import type { ReasoningOutput } from "../llm/types";

/**
 * External Analysis Pack Generator.
 *
 * Produces anonymized Markdown for external review (e.g. ChatGPT Pro).
 * Masks: operating capital, actual holdings, broker info, personal identifiers.
 * Uses % and R for price-relative expressions.
 */

export interface ExternalPackOptions {
  anonymize: boolean;
  includeScores: boolean;
  includeScenario: boolean;
  includeLlmAnalysis: boolean;
}

const DEFAULT_OPTIONS: ExternalPackOptions = {
  anonymize: true,
  includeScores: true,
  includeScenario: true,
  includeLlmAnalysis: true,
};

export function generateExternalPack(
  scored: ScoredSymbol,
  llmAnalysis?: ReasoningOutput | null,
  options: Partial<ExternalPackOptions> = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { symbol, scores, classification, snapshot } = scored;

  const lines: string[] = [];

  lines.push("# Signal One-shot External Analysis Pack");
  lines.push("");
  lines.push("あなたは投資分析の上級レビュアーです。");
  lines.push("以下のSignal分析データをもとに、対象銘柄のEntry可否を批判的にレビューしてください。");
  lines.push("");
  lines.push("## 目的");
  lines.push("");
  lines.push("短期〜中期の利益獲得を目的とした判断支援です。");
  lines.push("想定保有期間は3日〜3週間、必要に応じて1ヶ月〜3ヶ月です。");
  lines.push("");

  lines.push("## 重視する観点");
  lines.push("");
  lines.push("- 今Entryする優位性はあるか");
  lines.push("- Entry Timingは妥当か");
  lines.push("- 期待利益目安は現実的か");
  lines.push("- Stopは妥当か");
  lines.push("- Risk Rewardは十分か");
  lines.push("- 見送るべき条件は何か");
  lines.push("- 反証条件は明確か");
  lines.push("- Data Confidenceは十分か");
  lines.push("- Event Blockerはないか");
  lines.push("");

  lines.push("## 出力形式");
  lines.push("");
  lines.push("1. 結論");
  lines.push("2. Entryするなら条件");
  lines.push("3. Entryしない方がいい条件");
  lines.push("4. Expected Upsideの妥当性");
  lines.push("5. Stopの妥当性");
  lines.push("6. 主なリスク");
  lines.push("7. 見落としている可能性");
  lines.push("8. 最終判断");
  lines.push("9. 追加で確認すべきデータ");
  lines.push("");

  lines.push("## Signal Data");
  lines.push("");

  // Symbol info (anonymized)
  if (opts.anonymize) {
    lines.push(`- 銘柄: [Anonymized — ${symbol.sector ?? "Unknown Sector"}]`);
    lines.push(`- セクター: ${symbol.sector ?? "N/A"}`);
    lines.push(`- 業種: ${symbol.industry ?? "N/A"}`);
  } else {
    lines.push(`- 銘柄: ${symbol.name ?? symbol.symbol}`);
    lines.push(`- シンボル: ${symbol.symbol}`);
    lines.push(`- セクター: ${symbol.sector ?? "N/A"}`);
  }
  lines.push("");

  // Scores
  if (opts.includeScores) {
    const R = snapshot.close;
    lines.push("### 機械式スコア");
    lines.push(`- 機会スコア: ${scores.opportunityScore}/100`);
    lines.push(`- エントリータイミング: ${scores.entryTimingScore}/100`);
    lines.push(`- リスク: ${scores.riskScore}/100`);
    lines.push(`- 確信度: ${scores.convictionScore}/100`);
    lines.push(`- 最終エントリースコア: ${scores.finalEntryScore}/100`);
    lines.push(`- 戦略タグ: ${scores.strategyTags.join(", ")}`);
    lines.push("");

    lines.push("### テクニカル指標");
    lines.push(`- 終値: ${R.toLocaleString()}`);
    if (snapshot.sma20 != null) lines.push(`- SMA20: ${snapshot.sma20.toLocaleString()} (${((R / snapshot.sma20 - 1) * 100).toFixed(1)}%乖離)`);
    if (snapshot.sma50 != null) lines.push(`- SMA50: ${snapshot.sma50.toLocaleString()}`);
    if (snapshot.rsi14 != null) lines.push(`- RSI14: ${snapshot.rsi14.toFixed(0)}`);
    if (snapshot.volumeRatio20d != null) lines.push(`- 出来高比率(20d): ${snapshot.volumeRatio20d.toFixed(2)}x`);
    if (snapshot.return20d != null) lines.push(`- 20Dリターン: ${snapshot.return20d.toFixed(1)}%`);
    if (snapshot.drawdownFromRecentHighPct != null) lines.push(`- 直近高値からのDD: ${snapshot.drawdownFromRecentHighPct.toFixed(1)}%`);
    lines.push("");
  }

  // Scenario
  if (opts.includeScenario && classification.scenario) {
    const s = classification.scenario;
    lines.push("### Target / Stop");
    lines.push(`- Entry: ${s.entryPrice.toLocaleString()}`);
    lines.push(`- Stop: ${s.stopPrice.toLocaleString()} (${s.downsidePct.toFixed(1)}%)`);
    lines.push(`- Target (保守): ${s.targetConservative.toLocaleString()} (+${s.upsideConservativePct.toFixed(1)}%)`);
    lines.push(`- Target (基本): ${s.targetBase.toLocaleString()} (+${s.upsideBasePct.toFixed(1)}%)`);
    lines.push(`- Target (強気): ${s.targetBull.toLocaleString()} (+${s.upsideBullPct.toFixed(1)}%)`);
    lines.push(`- RR (基本): ${s.riskRewardBase.toFixed(1)}`);
    lines.push(`- 想定保有期間: ${s.expectedHoldingPeriod}`);
    lines.push("");
  }

  // Signal classification
  lines.push("### シグナル判定");
  lines.push(`- アクション: ${classification.action}`);
  lines.push(`- ティア: ${classification.tier}`);
  lines.push(`- 理由: ${classification.tierReason}`);
  if (classification.blockerReason) {
    lines.push(`- ブロッカー: ${classification.blockerReason}`);
  }
  lines.push(`- Data Confidence: ${scored.scores.breakdown.conviction.dataConfidence}/100`);
  lines.push("");

  // LLM analysis
  if (opts.includeLlmAnalysis && llmAnalysis) {
    lines.push("### LLM分析");
    lines.push("");
    lines.push(`**Bull Case**: ${llmAnalysis.bull_case}`);
    lines.push("");
    lines.push(`**Bear Case**: ${llmAnalysis.bear_case}`);
    lines.push("");
    if (llmAnalysis.key_risks.length > 0) {
      lines.push("**Key Risks**:");
      for (const r of llmAnalysis.key_risks) {
        lines.push(`- ${r}`);
      }
      lines.push("");
    }
    if (llmAnalysis.do_not_enter_if.length > 0) {
      lines.push("**Do Not Enter If**:");
      for (const c of llmAnalysis.do_not_enter_if) {
        lines.push(`- ${c}`);
      }
      lines.push("");
    }
    lines.push(`**Invalidation Condition**: ${llmAnalysis.invalidation_condition}`);
    lines.push("");
    lines.push(`**LLM Confidence**: ${llmAnalysis.confidence}/100`);
    lines.push(`**LLM Action**: ${llmAnalysis.action_suggestion}`);
    lines.push(`**Final Comment**: ${llmAnalysis.final_comment}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(`Generated by Signal v0.3 on ${new Date().toISOString().split("T")[0]}`);

  return lines.join("\n");
}
