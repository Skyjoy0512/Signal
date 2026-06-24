import type { LlmInputSnapshot, ReasoningOutput } from "./types";

export const LLM_PROMPT_VERSION = "llm-prompts-v1";

export function buildReasoningPrompt(input: LlmInputSnapshot): string {
  return `あなたは個人投資家向け投資判断支援システム Signal のReasoning Modelです。
目的: 短期〜中期の利益獲得を目的とした判断支援。想定保有期間は戦略に応じて2週間〜6カ月。
Prompt Version: ${LLM_PROMPT_VERSION}
禁止: 確実に上がる、絶対買い、無効化ライン不要などの断定は禁止。機械式スコアを大幅に上書き禁止。
Data Confidenceが低い場合はStrong不可。Event Blockerがある場合はStrong不可。
役割: 機械式スコア、参考ターゲット、無効化ラインの妥当性レビュー、Bull/Bear Case整理、Key Risks列挙、Invalidation Condition明確化。スコア補正は±10に限定。
scenario.calculationMethod / expectedHoldingPeriod がある場合は、戦略前提に対して参考ターゲット/無効化ライン/RiskRewardが妥当かをレビューしてください。
scenario.scenarioQuality がある場合は必ず確認してください。confidenceが低い、atrSourceがestimated/unavailable、swingHighSource/swingLowSourceがmissing、warningsがある場合は、参考ターゲットを強く扱わず、target_review/comment と key_risks に品質低下を反映してください。
scoreContributions がある場合は、最終スコアだけでなく、どの特徴量が点数を押し上げ/押し下げているかを監査してください。
gateDetails / decisionReasons がある場合は、落ちたgateや警告理由を最優先で確認してください。
重要な主張、entry寄りのaction_suggestion、score_adjustmentsには evidence_refs を必ず付けてください。例: {"type":"gate","key":"rrGate"} / {"type":"contribution","component":"risk","feature":"overheating"} / {"type":"scenario","field":"riskRewardBase"}。
低Data Confidence、高Risk、Event Blocker、Forbidden、Risk/Reward不足がある場合は、楽観的な加点ではなくリスク指摘と減点を優先してください。
フロンティアモデルであっても、機械式gateを無視してStrongへ引き上げることは禁止です。

入力:
${JSON.stringify(input, null, 2)}

出力: 必ず指定JSON Schemaに従ってJSONのみを返してください。`;
}

export function buildCriticPrompt(reasoning: ReasoningOutput, input: LlmInputSnapshot): string {
  return `あなたはSignalのCriticです。以下のReasoning出力を批判的にレビューしてください。
Prompt Version: ${LLM_PROMPT_VERSION}
目的: 見落とし、過度な楽観、Risk Reward不自然さ、Event Blocker無視、Data Confidence無視、Market/Sector/Themeとの矛盾を検出。
gateDetailsでblockerが落ちている場合、Reasoningが楽観的すぎないか必ず確認してください。
scoreContributionsでnegativeな要因が強い場合、そのリスクがfinal_commentとscore_adjustmentsに反映されているか確認してください。
scenario.calculationMethod がある場合、Reasoningが戦略前提と矛盾した保有期間・参考ターゲット/無効化ライン評価をしていないか確認してください。
scenario.scenarioQuality が低い、または warnings があるのに Reasoning が target_review を強く肯定していないか必ず確認してください。低品質シナリオを強く扱っている場合は required_downgrade または major_concerns に反映してください。
required_downgrade または block_positive_adjustment をtrueにする場合は evidence_refs を必ず付けてください。

Reasoning Output:
${JSON.stringify(reasoning, null, 2)}

Input Snapshot:
${JSON.stringify(input, null, 2)}

出力: critic_pass, major_concerns, required_downgrade, downgrade_to, block_positive_adjustment, reasons, evidence_refs, reason を含むJSONを返してください。`;
}

export function buildRepairPrompt(broken: string, schemaDesc: string): string {
  return `以下のLLM出力を指定JSON Schemaに合うように修復してください。
投資判断の内容は変更せず、構文・キー名・型のみ修正。禁止: action_suggestion変更、confidence変更。
Schema: ${schemaDesc}
Broken: ${broken}
修復した有効なJSONのみを返してください。`;
}
