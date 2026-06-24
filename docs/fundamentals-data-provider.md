# Fundamentals Data Provider

Signalの企業検索、企業詳細、業界ランキング、スクリーニング、企業比較は `src/lib/fundamentals/provider.ts` をデータ入口にする。

## 現在の挙動

1. `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` がある場合、`symbols` テーブルから日本株の銘柄マスターを読む。
2. `financial_statements` が存在すれば、PL/BS/CFとROE/営業利益率を実データとして読む。
3. `market_metrics` が存在すれば、株価、時価総額、PER、PBRなどを最新行から読む。
4. 財務/指標テーブルが未作成、空、または取得失敗した場合は銘柄コードから推定したデモ値にフォールバックする。
5. Supabaseが未設定、または銘柄マスター取得に失敗した場合は `src/lib/fundamentals/mock.ts` の30銘柄サンプルにフォールバックする。

## 公開API

- `GET /api/fundamentals`
  - `source`
  - `sourceLabel`
  - `generatedAt`
  - `companies`
  - `industries`
- `POST /api/fundamentals/seed`
  - Supabase接続がある場合、30銘柄デモデータを `symbols` / `financial_statements` / `market_metrics` に投入する。
  - Supabase未設定の場合は `400` を返す。
  - `FUNDAMENTALS_SEED_TOKEN` が未設定なら `400`、トークン不一致なら `401` を返す。

## 次に実データ化する場所

- `supabase/migrations/0002_fundamentals_schema.sql` を適用する。
- `financial_statements` に通期の実績PL/BS/CFを投入する。
- `market_metrics` に株価、時価総額、PER、PBR、EV/EBITDAなどを投入する。
- `symbolToCompany()` に銘柄マスターの業種コード、上場市場、テーマタグをマッピングする。

## ローカル確認手順

1. Supabaseに `supabase/migrations/0001_*` から `0007_*` までのマイグレーションを適用する。
   - Local: `npm run db:start`
   - Reset/apply migrations: `npm run db:reset`
   - Reset + lint: `npm run verify:db`
2. `.env.local` に `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FUNDAMENTALS_SEED_TOKEN` を設定する。
3. アプリを起動する。
4. `POST /api/fundamentals/seed` を実行する。
   - Header: `Authorization: Bearer $FUNDAMENTALS_SEED_TOKEN`
   - npm script: `npm run fundamentals:seed`
5. 最新の市場価格をYahoo Finance chart APIから `market_metrics` に反映する。
   - npm script: `npm run fundamentals:refresh-market`
   - 一部銘柄だけ更新: `FUNDAMENTALS_SEED_TICKERS=7203,8035 npm run fundamentals:refresh-market`
6. 実財務データCSV/JSONを `financial_statements` に反映する。
   - CSVテンプレート: `docs/data/financial-statements-template.csv`
   - 日本語ヘッダーCSVテンプレート: `docs/data/financial-statements-template-ja.csv`
   - npm script: `FINANCIAL_STATEMENTS_FILE=docs/data/financial-statements-template.csv npm run fundamentals:import-financials`
   - データ元を明示: `FINANCIAL_STATEMENTS_SOURCE=edinet_csv FINANCIAL_STATEMENTS_FILE=path/to/file.csv npm run fundamentals:import-financials`
7. `GET /api/fundamentals` の `source` が `supabase-fundamentals` になることを確認する。

## 現在のローカルSupabase起動メモ

- `supabase init --yes` 済み。
- `supabase/config.toml` は `project_id = "signal"`。
- Docker Desktop起動後、`npm run verify:db` で `supabase db reset --local --no-seed` と DB lint が通過済み。
- `docs/data/financial-statements-template-ja.csv` はローカルSupabaseへのAPI経由インポートと `supabase-fundamentals` 表示確認まで通過済み。
- `54322` が他プロジェクトで使用中の場合は、対象プロジェクトを `supabase stop --project-id <project_id>` で停止してから再実行する。

## 優先する実データテーブル案

- `financial_statements`
  - `ticker`, `period`, `period_type`, `revenue`, `operating_income`, `net_income`, `assets`, `equity`, `liabilities`, `operating_cash_flow`
- `market_metrics`
  - `ticker`, `captured_at`, `stock_price`, `market_cap`, `enterprise_value`, `per`, `pbr`, `ev_ebitda`, `psr`, `dividend_yield`, `roe`, `roic`, `roa`

## 市場指標の実データ更新

- `npm run fundamentals:refresh-market` は `POST /api/fundamentals/seed?mode=market` を呼び出す。
- `symbols` の日本株銘柄を読み、YFinance v8 chart APIから直近日足を取得する。
- `stock_price`, `market_cap`, `enterprise_value` は直近終値ベースで更新する。
- PER/PBR/ROEなどYahoo chart APIで取れない指標は、既存の推定値をフォールバックとして残す。
- 書き込み先は `market_metrics`、`source` は `yfinance`。

## 財務諸表の実データ更新

- `npm run fundamentals:import-financials` は `POST /api/fundamentals/seed?mode=financials` を呼び出す。
- 入力はCSV、JSON配列、JSONLに対応する。
- CSVヘッダーはDB列名、一般的な英語名、日本語名に対応する。
- 必須列は `ticker`, `period`。
- 主要列は `period_type`, `fiscal_year`, `fiscal_month`, `revenue`, `operating_income`, `net_income`, `assets`, `equity`, `liabilities`, `operating_cash_flow`, `roe`, `operating_margin`, `source`, `source_url`。
- 書き込み先は `financial_statements`、重複キーは `ticker,period,period_type`。

## 表示ラベル

- `mock`: Supabase未設定。30銘柄サンプル。
- `supabase-hybrid`: Supabase銘柄マスターあり。財務/指標は推定値。
- `supabase-fundamentals`: Supabase銘柄マスター + 財務/指標テーブルの実データを使用。
