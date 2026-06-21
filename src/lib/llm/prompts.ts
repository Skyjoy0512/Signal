import type { LlmInputSnapshot, ReasoningOutput } from "./types";

export function buildReasoningPrompt(input: LlmInputSnapshot): string {
  return `あなたは個人投資家向け投資判断支援システム Signal のReasoning Modelです。
目的: 短期〜中期の利益獲得を目的とした判断支援。想定保有期間は3日〜3週間。
禁止: 確実に上がる、絶対買い、損切り不要などの断定は禁止。機械式スコアを大幅に上書き禁止。
Data Confidenceが低い場合はStrong不可。Event Blockerがある場合はStrong不可。
役割: 機械式スコアとTarget/Stopの妥当性レビュー、Bull/Bear Case整理、Key Risks列挙、Invalidation Condition明確化。スコア補正は±10に限定。

入力:
${JSON.stringify(input, null, 2)}

出力: 必ず指定JSON Schemaに従ってJSONのみを返してください。`;
}

export function buildCriticPrompt(reasoning: ReasoningOutput, input: LlmInputSnapshot): string {
  return `あなたはSignalのCriticです。以下のReasoning出力を批判的にレビューしてください。
目的: 見落とし、過度な楽観、Risk Reward不自然さ、Event Blocker無視、Data Confidence無視、Market/Sector/Themeとの矛盾を検出。

Reasoning Output:
${JSON.stringify(reasoning, null, 2)}

Input Snapshot:
${JSON.stringify(input, null, 2)}

出力: critic_pass, major_concerns, required_downgrade, downgrade_to, reason を含むJSONを返してください。`;
}

export function buildRepairPrompt(broken: string, schemaDesc: string): string {
  return `以下のLLM出力を指定JSON Schemaに合うように修復してください。
投資判断の内容は変更せず、構文・キー名・型のみ修正。禁止: action_suggestion変更、confidence変更。
Schema: ${schemaDesc}
Broken: ${broken}
修復した有効なJSONのみを返してください。`;
}
