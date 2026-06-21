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

1. Supabaseに `supabase/migrations/0001_fundamentals_base_symbols.sql` と `0002_fundamentals_schema.sql` を適用する。
   - Local: `npm run db:start`
   - Reset/apply migrations: `npm run db:reset`
2. `.env.local` に `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FUNDAMENTALS_SEED_TOKEN` を設定する。
3. アプリを起動する。
4. `POST /api/fundamentals/seed` を実行する。
   - Header: `Authorization: Bearer $FUNDAMENTALS_SEED_TOKEN`
   - npm script: `npm run fundamentals:seed`
5. `GET /api/fundamentals` の `source` が `supabase-fundamentals` になることを確認する。

## 現在のローカルSupabase起動メモ

- `supabase init --yes` 済み。
- `supabase/config.toml` は `project_id = "signal"`。
- この環境では `supabase start` がDockerのcontainer health確認で無音待機し、手動停止した。
- Dockerが正常応答する状態で `npm run db:start` を再実行する。

## 優先する実データテーブル案

- `financial_statements`
  - `ticker`, `period`, `period_type`, `revenue`, `operating_income`, `net_income`, `assets`, `equity`, `liabilities`, `operating_cash_flow`
- `market_metrics`
  - `ticker`, `captured_at`, `stock_price`, `market_cap`, `enterprise_value`, `per`, `pbr`, `ev_ebitda`, `psr`, `dividend_yield`, `roe`, `roic`, `roa`

## 表示ラベル

- `mock`: Supabase未設定。30銘柄サンプル。
- `supabase-hybrid`: Supabase銘柄マスターあり。財務/指標は推定値。
- `supabase-fundamentals`: Supabase銘柄マスター + 財務/指標テーブルの実データを使用。
