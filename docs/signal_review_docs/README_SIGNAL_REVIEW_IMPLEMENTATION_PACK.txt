Signal Repository Review - Implementation Pack for Codex
=========================================================

対象Repository:
https://github.com/Skyjoy0512/Signal

プロダクト名:
Signal

目的:
個人利用の投資判断支援アプリとして、ソフトウェア設計、分析ロジック、DB履歴設計、LLM連携、UI/UX、テスト容易性、セキュリティを段階的に改善する。

重要前提:
- これは投資助言アプリではなく、投資判断の補助・レビュー支援アプリである。
- 売買の自動執行はしない。
- UI文言は「買い推奨」ではなく「レビュー候補」「確認観点」「参考水準」に寄せる。
- 分析ロジックレイヤーとLLMプロバイダーレイヤーは独立させる。
- 将来、より強いLLMへ差し替えたとき、分析レビュー品質が上がる構造にする。
- ただしLLM差し替え時の定量比較基盤は現時点では優先しない。

このパックの構成:

01_EXECUTIVE_SUMMARY.txt
  重要結論、全体方針、優先順位。

02_HIGH_PRIORITY_FINDINGS.txt
  P0/P1で直すべき重大な設計・品質問題。

03_FRONTEND_UX_FINDINGS.txt
  UI/UX、チャート、導線、投資助言リスクを避ける文言改善。

04_BACKEND_API_SUPABASE_FINDINGS.txt
  API routes、Supabase、RLS、secret、fallback設計の改善。

05_REFACTORING_PLAN.txt
  小さなPR単位の段階的リファクタリング計画。

06_ANALYSIS_LOGIC_IMPROVEMENTS.txt
  スコアリング、リスク評価、シグナル判定、ストーリーライン改善。

07_LLM_INTEGRATION_IMPROVEMENTS.txt
  LLM差し替え容易性、プロンプト、schema、guardrail、出力制御。

08_DATABASE_HISTORY_DESIGN.txt
  履歴保存、outcome評価、ストーリーライン改訂、再分析用DB設計。

09_TEST_PLAN_IMPROVEMENTS.txt
  追加すべきunit/integration/regression/UI/API/LLMテスト。

10_CODEX_IMPLEMENTATION_TASKS.txt
  Codexにそのまま渡すためのP0/P1/P2/P3実装タスク一覧。

11_RISKS_AND_CAUTIONS.txt
  投資助言リスク、LLM過信、データ品質、secret管理、バックテスト上の注意。

12_PROPOSED_NEW_FEATURES_ROADMAP.txt
  個人投資家向け追加機能ロードマップ。

推奨実行順:
1. 10_CODEX_IMPLEMENTATION_TASKS.txt の P0-1, P0-2 を先に実装する。
2. その後 P1-1 ChartContainer、P1-2/P1-3 API保護・入力検証を実装する。
3. DB履歴拡張と新機能はP2以降で段階的に進める。

Codexへの指示例:
「このImplementation Packを読み、まず P0-1 と P0-2 だけを実装してください。変更範囲を対象ファイルに限定し、既存テストに加えて指定された回帰テストを追加してください。」
