-- Storyline simulations store best/base/conservative/worst narratives per symbol.

create table if not exists public.storyline_sets (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  symbol_id uuid references public.symbols(id) on delete cascade,
  symbol text not null,
  generated_at timestamptz not null,
  status text not null,
  active_scenario text not null,
  revision_summary text,
  revision_reasons_json jsonb not null default '[]'::jsonb,
  score_snapshot_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.storyline_scenarios (
  id uuid primary key default gen_random_uuid(),
  storyline_set_id uuid not null references public.storyline_sets(id) on delete cascade,
  scenario_kind text not null,
  label text not null,
  probability_pct numeric not null,
  horizon text not null,
  thesis text not null,
  expected_return_pct numeric not null,
  target_price numeric not null,
  stop_price numeric not null,
  key_drivers_json jsonb not null default '[]'::jsonb,
  confirmation_signals_json jsonb not null default '[]'::jsonb,
  invalidation_signals_json jsonb not null default '[]'::jsonb,
  risk_notes_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists storyline_sets_symbol_generated_at_idx
  on public.storyline_sets (symbol, generated_at desc);

create index if not exists storyline_sets_analysis_run_id_idx
  on public.storyline_sets (analysis_run_id);

create unique index if not exists storyline_scenarios_set_kind_idx
  on public.storyline_scenarios (storyline_set_id, scenario_kind);

alter table public.storyline_sets enable row level security;
alter table public.storyline_scenarios enable row level security;

grant select, insert, update, delete on table public.storyline_sets to service_role;
grant select, insert, update, delete on table public.storyline_scenarios to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'storyline_sets'
      and policyname = 'storyline_sets_service_role_all'
  ) then
    create policy storyline_sets_service_role_all
      on public.storyline_sets
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'storyline_scenarios'
      and policyname = 'storyline_scenarios_service_role_all'
  ) then
    create policy storyline_scenarios_service_role_all
      on public.storyline_scenarios
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;
