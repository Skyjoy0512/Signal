# Signal — プロジェクトコンテキスト（トークン圧縮版）

**スタック:** Next.js 16 / React 19 / Tailwind 4 / Supabase / Vitest
**デザイン:** Cursor準拠 ウォームペーパー (#f7f7f4, #26251e, #f54e00)
**DB:** Supabase Postgres, スキーマ: `supabase/migrations/0001_*`〜`0007_*`
**LLM:** DeepSeek / OpenAI-compatible providers（GUI設定 + 環境変数フォールバック）
**通知:** LINE Messaging API
**フェーズ:** Phase1-A（日本株のみ、自動売買禁止、証券会社連携禁止）

## ディレクトリ構造
```
src/lib/
  indicators/     — SMA/RSI/ATR/出来高/52W/DD 計算
  intelligence/   — 4層分析: 市場→セクター→テーマ→銘柄
  data-sources/   — YFinanceAdapter (.T 自動付加)
  scoring/        — 機械式スコア + LLM補正 + シグナル分類 + 参考ターゲット/無効化ライン
  llm/            — DeepSeek + JSONスキーマ検証 + 修復 + Critic
  notifications/  — LINEクライアント + 予算/クールダウン管理
  jobs/           — 日次スキャンパイプライン（全配線済み、DB永続化/LLM/LINEはオプション）
  trades/         — 手動/ペーパーポジション + P&L
  outcomes/       — 1W/1M/3Mトラッカー + ベンチマーク比較
  security/       — キルスイッチ + 禁止銘柄 + 匿名化 + 外部分析パック
  supabase/       — クライアント/サーバー + リポジトリ
  mock/           — デモ用スタンドアロンプロバイダー（15銘柄、260日分の模擬データ）
```

## 主要ファイル
- `jobs/daily-scan.ts` — メインパイプライン。DB永続化/LLM/LINEはオプション引数で制御
- `scoring/scoring-engine.ts` — 機会/タイミング/リスク/確信度の4スコア + 戦略適合 + 最終
- `scoring/signal-detector.ts` — 最優先レビュー候補 / 追加確認候補 / 監視 / 見送り の分類
- `llm/orchestrator.ts` — 推論→検証→修復→Critic のパイプライン
- `mock/provider.ts` — Supabase/APIキー不要のデモモード

## API
- `GET /api/signals` — 現在のシグナル一覧
- `POST /api/jobs/daily-scan` — スキャン実行（管理トークン保護）
- `GET /api/external-pack?symbol=` — 匿名化Markdownダウンロード（管理トークン保護）
- `GET/POST /api/settings/llm` — LLM設定の読み書き（管理トークン保護）
- `POST /api/line/webhook` — LINEボット受信

## ページ（全日本語化済み）
`/`（ヒーロー+モジュールカード）, `/dashboard`, `/candidates`, `/companies`, `/industries`, `/compare`, `/positions`, `/review`, `/screening`, `/settings`

## 状態
- `npm run verify`: typecheck / test / lint / build / UI検証 / API保護検証 全通過
- `npm run verify:db`: Supabase local reset + DB lint 全通過
- テスト: 143件 / 14ファイル 全通過
- 開発サーバー: `npm run dev`
