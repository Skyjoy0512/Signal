# Production Deployment Runbook

This runbook covers hosted Supabase plus Vercel-style Next.js hosting.

## Current Status

- Local Supabase integration is verified.
- Local migrations `0001_*` through `0007_*` plus `20260624225320_add_advisor_foreign_key_indexes.sql` reset cleanly.
- Local DB lint passes.
- Local API smoke confirms `source: supabase-fundamentals` after seed/import.
- `npm run deploy:check-env` is available for production env validation.
- `npm run deploy:supabase-status` is available for Supabase readiness checks.
- `npm run deploy:sync-supabase-env` is available for syncing hosted Supabase URL/API keys into Vercel.
- `npm run deploy:smoke` is available for hosted app smoke tests.
- Vercel project `signal` is created and linked locally.
- Production deployment is live at `https://signal-kappa-ten.vercel.app`.
- Hosted Supabase project `signal` is created and linked locally.
- Hosted Supabase project ref: `qyifzwzguwrpkrvyvbzb`.
- Hosted Supabase migrations are applied through `20260624225320_add_advisor_foreign_key_indexes.sql`.
- Supabase URL/API keys are stored in the Vercel project for Production, Preview, and Development.
- Required non-Supabase Vercel environment variables are stored in the Vercel project for Production, Preview, and Development.
- A local ignored `.env.local` contains the generated Vercel admin/seed/encryption values for operator smoke tests.
- Vercel SSO deployment protection was disabled for public smoke testing.
- Production API `GET /api/fundamentals` returns `source: "supabase-fundamentals"` after seed/import.
- GitHub auto-deploy from Vercel is not connected yet because the Vercel account needs a GitHub Login Connection.

## Required Accounts

- GitHub repository: `https://github.com/Skyjoy0512/Signal`
- Hosted Supabase project: `qyifzwzguwrpkrvyvbzb`
- Vercel project connected to the GitHub repository for automatic deploys

## Supabase Setup

1. Login:

```bash
supabase login
```

2. Link the hosted project:

```bash
supabase link --project-ref <project-ref>
```

3. Push migrations:

```bash
supabase db push
```

4. Verify migration state:

```bash
supabase migration list
```

5. Run advisors if available:

```bash
supabase db advisors
```

The migrations explicitly grant Data API access to `service_role` and enable RLS. This is intentional for newer Supabase defaults where public tables are not automatically exposed.

## Agent Bootstrap

Codex can run the deployment bootstrap non-interactively when tokens are provided through environment variables. The default mode is safe and performs verification plus dry-runs where possible.

Dry-run:

```bash
SUPABASE_ACCESS_TOKEN=<token> \
SUPABASE_PROJECT_REF=<project-ref> \
SUPABASE_DB_PASSWORD=<db-password> \
VERCEL_TOKEN=<token> \
VERCEL_PROJECT_NAME=signal \
npm run deploy:bootstrap
```

Apply:

```bash
DEPLOY_APPLY=1 \
SUPABASE_ACCESS_TOKEN=<token> \
SUPABASE_PROJECT_REF=<project-ref> \
SUPABASE_DB_PASSWORD=<db-password> \
VERCEL_TOKEN=<token> \
VERCEL_PROJECT_NAME=signal \
npm run deploy:bootstrap
```

Do not commit these token values.

If this repository is already linked with `.vercel/project.json`, `VERCEL_PROJECT_NAME` can be omitted when using an already-authenticated local Vercel CLI session. Keep `VERCEL_TOKEN` for repeatable non-interactive runs.

To let Codex create the hosted Supabase project first, provide a Supabase access token and either an org ID or an account with exactly one organization:

```bash
DEPLOY_APPLY=1 \
SUPABASE_ACCESS_TOKEN=<token> \
SUPABASE_CREATE_PROJECT=1 \
SUPABASE_ORG_ID=<org-id> \
SUPABASE_PROJECT_NAME=signal \
SUPABASE_REGION=ap-northeast-1 \
VERCEL_TOKEN=<token> \
npm run deploy:bootstrap
```

If `SUPABASE_DB_PASSWORD` is omitted in create mode, the bootstrap generates one in memory and does not print it. Store a permanent database password in your password manager if you need direct database access later.

To only sync Supabase environment values to the linked Vercel project:

```bash
SUPABASE_ACCESS_TOKEN=<token> \
SUPABASE_PROJECT_REF=<project-ref> \
VERCEL_TOKEN=<token> \
npm run deploy:sync-supabase-env
```

If the Supabase CLI cannot read API keys, set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the shell and rerun the same command.

## Hosting Environment Variables

Set these in the hosting provider for Production, Preview, and Development as appropriate.

Required:

- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ADMIN_TOKEN`
- `APP_SETTINGS_ENCRYPTION_KEY`
- `FUNDAMENTALS_SEED_TOKEN`

Recommended:

- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `LLM_PROVIDER`
- `LLM_MODEL`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `LINE_USER_ID`
- `YFINANCE_PROXY_URL`
- `APP_TIMEZONE`
- `DAILY_LLM_COST_LIMIT_USD`

Do not set `APP_SETTINGS_ENCRYPTION_KEY` to the same value as `SUPABASE_SERVICE_ROLE_KEY`.

## Predeploy Checks

```bash
npm run deploy:supabase-status
npm run deploy:sync-supabase-env
npm run deploy:check-env
npm run verify
npm run verify:db
npm audit
git diff --check
```

GitHub Actions:

- `CI` runs app verification on pushes and pull requests.
- `Supabase Local Verification` runs `npm run verify:db` manually through `workflow_dispatch`.

## Data Bootstrap

After the hosted app and hosted Supabase variables are configured:

```bash
NEXT_PUBLIC_APP_URL=https://<production-host> FUNDAMENTALS_SEED_TOKEN=<token> npm run fundamentals:seed
NEXT_PUBLIC_APP_URL=https://<production-host> FUNDAMENTALS_SEED_TOKEN=<token> npm run fundamentals:refresh-market
NEXT_PUBLIC_APP_URL=https://<production-host> FUNDAMENTALS_SEED_TOKEN=<token> FINANCIAL_STATEMENTS_FILE=path/to/file.csv npm run fundamentals:import-financials
```

## Smoke Test

Automated:

```bash
APP_UNDER_TEST_URL=https://<production-host> APP_UNDER_TEST_ADMIN_TOKEN=<admin-token> npm run deploy:smoke
```

Current production smoke without admin token:

```bash
APP_UNDER_TEST_URL=https://signal-kappa-ten.vercel.app npm run deploy:smoke
```

Current hosted data check:

```bash
curl -sS https://signal-kappa-ten.vercel.app/api/fundamentals
```

The response should include `source: "supabase-fundamentals"`.

Manual:

1. Open `/dashboard`, `/candidates`, `/review`, `/compare`, and `/settings`.
2. Confirm `/api/fundamentals` returns `source: "supabase-fundamentals"` after seed/import.
3. Confirm protected APIs return `401` without tokens.
4. Confirm `/settings` works after entering `APP_ADMIN_TOKEN`.
5. Confirm no service role key is exposed to the browser.
