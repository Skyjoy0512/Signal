-- Minimal symbol master required by fundamentals provider/importer.
-- Kept intentionally narrow and idempotent so it can coexist with a richer app schema.

create extension if not exists pgcrypto;

create table if not exists public.symbols (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  name text,
  asset_type text not null default 'jp_stock',
  exchange text,
  currency text,
  sector text,
  industry text,
  country text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists symbols_asset_type_active_idx
  on public.symbols (asset_type, is_active);

alter table public.symbols enable row level security;

grant select, insert, update, delete on table public.symbols to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'symbols'
      and policyname = 'symbols_service_role_all'
  ) then
    create policy symbols_service_role_all
      on public.symbols
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

-- Core app tables required by the daily scan repository.
-- Kept idempotent so local resets work even when richer production schemas already exist.

create table if not exists public.forbidden_symbols (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  asset_type text,
  exchange text,
  reason text not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.events_calendar (
  id uuid primary key default gen_random_uuid(),
  symbol_id uuid references public.symbols(id) on delete cascade,
  event_type text,
  impact_level text not null default 'medium',
  blocker_start date,
  blocker_end date,
  title text,
  raw_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  symbol_id uuid not null references public.symbols(id) on delete cascade,
  timeframe text not null,
  captured_at timestamptz not null,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  adjusted_close numeric,
  volume numeric,
  sma20 numeric,
  sma50 numeric,
  sma200 numeric,
  rsi14 numeric,
  atr14 numeric,
  atr20 numeric,
  volume_20d_avg numeric,
  volume_ratio_20d numeric,
  return_1d numeric,
  return_5d numeric,
  return_20d numeric,
  return_60d numeric,
  high_52w numeric,
  low_52w numeric,
  distance_from_52w_high_pct numeric,
  drawdown_from_recent_high_pct numeric,
  turnover numeric,
  fundamentals_json jsonb,
  catalyst_json jsonb,
  raw_json jsonb,
  data_confidence numeric not null default 0,
  data_confidence_reason jsonb,
  created_at timestamptz not null default now(),
  unique (symbol_id, timeframe, captured_at)
);

create table if not exists public.layer_conditions (
  id uuid primary key default gen_random_uuid(),
  layer_name text not null,
  inputs_json jsonb,
  scope_key text not null,
  timeframe text not null,
  captured_at timestamptz not null,
  condition text not null,
  trend text not null,
  strength numeric not null,
  risk numeric not null,
  confidence numeric not null,
  impact text not null,
  reason text,
  data_confidence numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (layer_name, scope_key, timeframe, captured_at)
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  symbol_id uuid not null references public.symbols(id) on delete cascade,
  signal_type text not null,
  action_suggestion text not null,
  tier text not null,
  opportunity_score numeric not null,
  entry_timing_score numeric not null,
  risk_score numeric not null,
  conviction_score numeric not null,
  final_entry_score numeric not null,
  data_confidence numeric not null,
  tier_reason text,
  blocker_reason text,
  strategy_tags_json jsonb not null default '[]'::jsonb,
  strategy_fit_scores_json jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trade_scenarios (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.signals(id) on delete cascade,
  entry_price numeric not null,
  stop_price numeric,
  target_base numeric,
  risk_reward_base numeric,
  created_at timestamptz not null default now(),
  unique (signal_id)
);

create table if not exists public.llm_runs (
  id uuid primary key default gen_random_uuid(),
  task_type text not null,
  run_role text not null,
  status text not null,
  input_snapshot_json jsonb not null,
  output_json jsonb,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric,
  latency_ms integer,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.system_health_logs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  status text not null,
  error_message text,
  metrics_json jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists forbidden_symbols_symbol_enabled_idx
  on public.forbidden_symbols (symbol, is_enabled);
create index if not exists events_calendar_symbol_blocker_idx
  on public.events_calendar (symbol_id, blocker_start, blocker_end);
create index if not exists market_snapshots_symbol_timeframe_captured_idx
  on public.market_snapshots (symbol_id, timeframe, captured_at desc);
create index if not exists layer_conditions_scope_captured_idx
  on public.layer_conditions (layer_name, scope_key, timeframe, captured_at desc);
create index if not exists signals_symbol_detected_idx
  on public.signals (symbol_id, detected_at desc);
create index if not exists llm_runs_task_created_idx
  on public.llm_runs (task_type, created_at desc);
create index if not exists system_health_logs_job_created_idx
  on public.system_health_logs (job_type, created_at desc);

alter table public.forbidden_symbols enable row level security;
alter table public.events_calendar enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.layer_conditions enable row level security;
alter table public.signals enable row level security;
alter table public.trade_scenarios enable row level security;
alter table public.llm_runs enable row level security;
alter table public.system_health_logs enable row level security;

grant select, insert, update, delete on table public.forbidden_symbols to service_role;
grant select, insert, update, delete on table public.events_calendar to service_role;
grant select, insert, update, delete on table public.market_snapshots to service_role;
grant select, insert, update, delete on table public.layer_conditions to service_role;
grant select, insert, update, delete on table public.signals to service_role;
grant select, insert, update, delete on table public.trade_scenarios to service_role;
grant select, insert, update, delete on table public.llm_runs to service_role;
grant select, insert, update, delete on table public.system_health_logs to service_role;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'forbidden_symbols',
    'events_calendar',
    'market_snapshots',
    'layer_conditions',
    'signals',
    'trade_scenarios',
    'llm_runs',
    'system_health_logs'
  ] loop
    policy_name := table_name || '_service_role_all';
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = policy_name
    ) then
      execute format(
        'create policy %I on public.%I for all to service_role using (true) with check (true)',
        policy_name,
        table_name
      );
    end if;
  end loop;
end $$;
