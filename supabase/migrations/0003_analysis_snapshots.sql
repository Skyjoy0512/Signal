-- Analysis run and score snapshot tables for backtestable scoring improvements.

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null,
  run_key text,
  status text not null default 'completed',
  started_at timestamptz,
  finished_at timestamptz,
  config_json jsonb,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.score_snapshots (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  signal_id uuid references public.signals(id) on delete set null,
  symbol_id uuid references public.symbols(id) on delete cascade,
  symbol text not null,
  captured_at timestamptz not null,
  action_suggestion text not null,
  tier text not null,
  opportunity_score numeric not null,
  entry_timing_score numeric not null,
  risk_score numeric not null,
  conviction_score numeric not null,
  final_entry_score numeric not null,
  data_confidence numeric not null,
  score_breakdown_json jsonb not null,
  score_contributions_json jsonb not null,
  gate_details_json jsonb not null,
  decision_reasons_json jsonb not null,
  strategy_tags_json jsonb not null,
  strategy_fit_scores_json jsonb not null,
  input_snapshot_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analysis_runs_run_type_created_at_idx
  on public.analysis_runs (run_type, created_at desc);

create index if not exists score_snapshots_symbol_captured_at_idx
  on public.score_snapshots (symbol, captured_at desc);

create index if not exists score_snapshots_signal_id_idx
  on public.score_snapshots (signal_id);

create index if not exists score_snapshots_analysis_run_id_idx
  on public.score_snapshots (analysis_run_id);

alter table public.analysis_runs enable row level security;
alter table public.score_snapshots enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_runs'
      and policyname = 'analysis_runs_service_role_all'
  ) then
    create policy analysis_runs_service_role_all
      on public.analysis_runs
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'score_snapshots'
      and policyname = 'score_snapshots_service_role_all'
  ) then
    create policy score_snapshots_service_role_all
      on public.score_snapshots
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
