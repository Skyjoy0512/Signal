-- Outcome and review-history tables for calibration and after-the-fact analysis.

create table if not exists public.price_observations (
  id uuid primary key default gen_random_uuid(),
  symbol_id uuid references public.symbols(id) on delete cascade,
  symbol text not null,
  observed_at timestamptz not null,
  timeframe text not null,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  adjusted_close numeric,
  volume numeric,
  source text not null,
  source_as_of timestamptz,
  raw_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.signal_outcomes (
  id uuid primary key default gen_random_uuid(),
  score_snapshot_id uuid references public.score_snapshots(id) on delete set null,
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  symbol_id uuid references public.symbols(id) on delete cascade,
  horizon text not null,
  entry_reference_price numeric,
  price_at_horizon numeric,
  max_favorable_excursion_pct numeric,
  max_adverse_excursion_pct numeric,
  return_pct numeric,
  benchmark_return_pct numeric,
  excess_return_pct numeric,
  hit_target_base boolean,
  hit_stop boolean,
  rr_realized numeric,
  outcome_label text,
  evaluated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.storyline_outcomes (
  id uuid primary key default gen_random_uuid(),
  storyline_set_id uuid references public.storyline_sets(id) on delete cascade,
  storyline_scenario_id uuid references public.storyline_scenarios(id) on delete set null,
  symbol_id uuid references public.symbols(id) on delete cascade,
  scenario_kind text not null,
  horizon text not null,
  target_price numeric,
  stop_price numeric,
  actual_close numeric,
  actual_high numeric,
  actual_low numeric,
  scenario_hit boolean,
  distance_to_target_pct numeric,
  distance_to_stop_pct numeric,
  review_comment text,
  evaluated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.storyline_revisions (
  id uuid primary key default gen_random_uuid(),
  previous_storyline_set_id uuid references public.storyline_sets(id) on delete set null,
  new_storyline_set_id uuid references public.storyline_sets(id) on delete cascade,
  symbol_id uuid references public.symbols(id) on delete cascade,
  revision_type text,
  from_active_scenario text,
  to_active_scenario text,
  score_delta_json jsonb,
  reason_codes_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_decisions (
  id uuid primary key default gen_random_uuid(),
  score_snapshot_id uuid references public.score_snapshots(id) on delete set null,
  storyline_set_id uuid references public.storyline_sets(id) on delete set null,
  symbol_id uuid references public.symbols(id) on delete cascade,
  decision text not null,
  decision_reason text,
  planned_entry_price numeric,
  planned_stop_price numeric,
  position_size_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  symbol_id uuid references public.symbols(id) on delete cascade,
  score_snapshot_id uuid references public.score_snapshots(id) on delete set null,
  storyline_set_id uuid references public.storyline_sets(id) on delete set null,
  event_type text not null,
  severity text not null,
  title text not null,
  details_json jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.data_quality_observations (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  symbol_id uuid references public.symbols(id) on delete cascade,
  source text,
  dataset text,
  as_of timestamptz,
  freshness_hours numeric,
  missing_fields_json jsonb,
  confidence_score numeric,
  reason_json jsonb,
  created_at timestamptz not null default now()
);

alter table public.analysis_runs
  add column if not exists engine_version text,
  add column if not exists scoring_config_version text,
  add column if not exists feature_schema_version text,
  add column if not exists prompt_version text,
  add column if not exists llm_schema_version text,
  add column if not exists universe_type text,
  add column if not exists data_source_summary_json jsonb;

do $$
begin
  if to_regclass('public.llm_runs') is not null then
    alter table public.llm_runs
      add column if not exists provider text,
      add column if not exists model text,
      add column if not exists prompt_version text,
      add column if not exists schema_version text,
      add column if not exists temperature numeric,
      add column if not exists max_tokens integer,
      add column if not exists repair_attempt_count integer not null default 0,
      add column if not exists critic_enabled boolean not null default false,
      add column if not exists finish_reason text,
      add column if not exists estimated_cost_usd numeric,
      add column if not exists request_id text,
      add column if not exists input_hash text,
      add column if not exists output_hash text;
  end if;
end $$;

alter table public.score_snapshots
  add column if not exists score_engine_version text,
  add column if not exists scoring_config_version text,
  add column if not exists feature_snapshot_id uuid,
  add column if not exists market_data_as_of timestamptz,
  add column if not exists scenario_quality_json jsonb,
  add column if not exists feature_availability_json jsonb,
  add column if not exists score_calibration_version text;

alter table public.storyline_sets
  add column if not exists storyline_engine_version text,
  add column if not exists scenario_probability_method text,
  add column if not exists input_score_snapshot_id uuid references public.score_snapshots(id) on delete set null,
  add column if not exists llm_run_id uuid references public.llm_runs(id) on delete set null,
  add column if not exists data_quality_json jsonb;

alter table public.storyline_scenarios
  add column if not exists raw_weight numeric,
  add column if not exists normalized_probability_pct numeric;

create index if not exists price_observations_symbol_id_timeframe_observed_idx
  on public.price_observations (symbol_id, timeframe, observed_at desc);
create index if not exists price_observations_symbol_timeframe_observed_idx
  on public.price_observations (symbol, timeframe, observed_at desc);
create unique index if not exists price_observations_unique_source_idx
  on public.price_observations (symbol_id, timeframe, observed_at, source);

create index if not exists signal_outcomes_snapshot_horizon_idx
  on public.signal_outcomes (score_snapshot_id, horizon);
create index if not exists signal_outcomes_analysis_run_horizon_idx
  on public.signal_outcomes (analysis_run_id, horizon);
create index if not exists signal_outcomes_symbol_horizon_idx
  on public.signal_outcomes (symbol_id, horizon);

create index if not exists storyline_outcomes_set_horizon_idx
  on public.storyline_outcomes (storyline_set_id, horizon);
create index if not exists storyline_outcomes_symbol_horizon_idx
  on public.storyline_outcomes (symbol_id, horizon);
create index if not exists storyline_revisions_symbol_created_idx
  on public.storyline_revisions (symbol_id, created_at desc);
create index if not exists user_decisions_symbol_created_idx
  on public.user_decisions (symbol_id, created_at desc);
create index if not exists review_events_symbol_created_idx
  on public.review_events (symbol_id, created_at desc);
create index if not exists review_events_type_severity_created_idx
  on public.review_events (event_type, severity, created_at desc);
create index if not exists data_quality_observations_symbol_dataset_idx
  on public.data_quality_observations (symbol_id, dataset, as_of desc);

alter table public.price_observations enable row level security;
alter table public.signal_outcomes enable row level security;
alter table public.storyline_outcomes enable row level security;
alter table public.storyline_revisions enable row level security;
alter table public.user_decisions enable row level security;
alter table public.review_events enable row level security;
alter table public.data_quality_observations enable row level security;

grant select, insert, update, delete on table public.price_observations to service_role;
grant select, insert, update, delete on table public.signal_outcomes to service_role;
grant select, insert, update, delete on table public.storyline_outcomes to service_role;
grant select, insert, update, delete on table public.storyline_revisions to service_role;
grant select, insert, update, delete on table public.user_decisions to service_role;
grant select, insert, update, delete on table public.review_events to service_role;
grant select, insert, update, delete on table public.data_quality_observations to service_role;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'price_observations',
    'signal_outcomes',
    'storyline_outcomes',
    'storyline_revisions',
    'user_decisions',
    'review_events',
    'data_quality_observations'
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
