# Codex Implementation Status

This file summarizes the implementation state after applying the GPT PRO review pack.

## Completed Scope

- P0 scoring corrections:
  - `finalEntryScore` now stays neutral for neutral inputs instead of being inflated by the final formula.
  - LLM adjustments reapply final score caps for low data confidence, event blockers, bearish markets, and forbidden symbols.
- P1 frontend/API hardening:
  - Recharts usage now goes through measured `ChartContainer` dimensions instead of `ResponsiveContainer`.
  - Sensitive API routes are protected by `APP_ADMIN_TOKEN` when configured, and production rejects missing admin token.
  - LLM settings validation rejects invalid providers, weak URLs, private/local targets, invalid temperatures, and negative budgets.
  - Settings UI supports an admin token field and uses `x-signal-admin-token`.
- P1/P2 analysis and persistence:
  - `AnalysisInputSnapshotV1` records schema/version/provenance/feature availability.
  - Outcome/history migration adds price observations, signal outcomes, storyline outcomes, storyline revisions, user decisions, review events, and data quality observations.
  - Core app tables used by repository code are present in migration order.
  - Storyline probabilities are normalized to 100 with `rule-normalized-v1` metadata.
  - `ScoreContribution` includes `signedImpact` and `impactMagnitude`.
- Fundamentals data path:
  - `fundamentals:refresh-market` refreshes `market_metrics` from Yahoo Finance chart data.
  - `fundamentals:import-financials` imports CSV, Japanese-header CSV, JSON array, or JSONL rows into `financial_statements`.
  - Seed API authorization now checks `FUNDAMENTALS_SEED_TOKEN` before exposing Supabase configuration state.
- P3 copy posture:
  - Main surfaces use review/support wording instead of direct investment recommendation wording.
  - UI copy regression tests block phrases such as `Strong Entry`, `買い推奨`, `損切`, and `利確`.

## Review Assets

- Prompt folder: `docs/reviews/gpt-pro/`
- Implementation pack: `docs/signal_review_docs/`
- Main prompt: `docs/reviews/gpt-pro/2026-06-22-multidimensional-review-prompt.txt`

## Verification

Passed on 2026-06-24:

- `npm run verify`
  - `npm run typecheck`
  - `npm test` (`143` tests / `14` files)
  - `npm run lint`
  - `npm run build`
  - UI route verification without admin token
  - UI route verification with admin token
  - Settings admin token UI flow verification
  - protected API verification
- `npm audit`
- `git diff --check`
- `npm run verify:db`
  - Supabase local reset applied migrations `0001_*` through `0007_*` plus `20260624225320_add_advisor_foreign_key_indexes.sql`.
  - Supabase DB lint completed with no schema errors.
- Local Supabase API smoke:
  - Seeded mock symbol/fundamental baseline through `POST /api/fundamentals/seed`.
  - Imported `docs/data/financial-statements-template-ja.csv` through `mode=financials`.
  - Verified `GET /api/fundamentals` returned `source: supabase-fundamentals` with 30 companies and 33 industries.
- Deployment readiness:
  - Added `deploy:check-env` for production environment validation.
  - Added `deploy:bootstrap` for token-based Supabase/Vercel setup and dry-run/apply flows.
  - Added `deploy:supabase-status` for Supabase CLI/link/local DB readiness checks.
  - Added `deploy:sync-supabase-env` for syncing hosted Supabase URL/API keys into Vercel environments.
  - Extended `deploy:bootstrap` so it can create a hosted Supabase project when `SUPABASE_CREATE_PROJECT=1` and token/org access are provided.
  - Added `deploy:smoke` for hosted app smoke tests.
  - Added `review:pack` for recurring GPT PRO review prompt/manifest/zip generation.
  - Added GitHub Actions app CI and manual Supabase local DB verification workflows.
  - Verified `deploy:check-env` and `deploy:smoke` against local Supabase/local Next.js.
  - Verified `deploy:supabase-status` reports local DB readiness and hosted auth/link blockers.
  - Supabase plugin is connected but currently returns no hosted projects for this account/session.
  - Created and linked Vercel project `signal`.
  - Added required non-Supabase Vercel env vars for Production, Preview, and Development.
  - Deployed production build to `https://signal-kappa-ten.vercel.app`.
  - Disabled Vercel SSO protection and verified `deploy:smoke` against the production URL.
  - Created hosted Supabase project `signal` with ref `qyifzwzguwrpkrvyvbzb`.
  - Pushed hosted Supabase migrations through `20260624225320_add_advisor_foreign_key_indexes.sql`.
  - Synced hosted Supabase URL/API keys to Vercel Production, Preview, and Development.
  - Redeployed production after Supabase env sync.
  - Seeded hosted fundamentals data and imported the Japanese financial statement template through the production API.
  - Verified production `GET /api/fundamentals` returns `source: supabase-fundamentals` with 30 companies and 33 industries.
  - Verified hosted Supabase security advisor returns no warnings; performance advisor now only reports expected new-database unused-index INFO entries.

## Remaining Work

- Add a GitHub Login Connection in Vercel to enable automatic GitHub deploys.
- Run the financial import path against a real EDINET/vendor export file.
- Decide whether to commit this as one review-hardening branch or split into smaller PRs by P0/P1/P2/P3 scope.
