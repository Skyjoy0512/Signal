-- Fundamentals schema for Buffett Code style company/industry views.
-- Existing `symbols.symbol` is treated as the ticker master key.

create table if not exists public.financial_statements (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  period text not null,
  period_type text not null default 'annual',
  fiscal_year integer,
  fiscal_month integer,
  revenue numeric,
  operating_income numeric,
  net_income numeric,
  assets numeric,
  equity numeric,
  liabilities numeric,
  operating_cash_flow numeric,
  roe numeric,
  operating_margin numeric,
  source text,
  source_url text,
  raw_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ticker, period, period_type)
);

create table if not exists public.market_metrics (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  captured_at timestamptz not null default now(),
  stock_price numeric,
  market_cap numeric,
  enterprise_value numeric,
  per numeric,
  pbr numeric,
  ev_ebitda numeric,
  psr numeric,
  dividend_yield numeric,
  roe numeric,
  roic numeric,
  roa numeric,
  source text,
  source_url text,
  raw_json jsonb,
  created_at timestamptz not null default now(),
  unique (ticker, captured_at)
);

create index if not exists financial_statements_ticker_period_idx
  on public.financial_statements (ticker, period_type, period);

create index if not exists market_metrics_ticker_captured_at_idx
  on public.market_metrics (ticker, captured_at desc);

alter table public.financial_statements enable row level security;
alter table public.market_metrics enable row level security;

grant select, insert, update, delete on table public.financial_statements to service_role;
grant select, insert, update, delete on table public.market_metrics to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_statements'
      and policyname = 'financial_statements_service_role_all'
  ) then
    create policy financial_statements_service_role_all
      on public.financial_statements
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'market_metrics'
      and policyname = 'market_metrics_service_role_all'
  ) then
    create policy market_metrics_service_role_all
      on public.market_metrics
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;
