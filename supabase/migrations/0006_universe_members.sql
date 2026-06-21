-- User-scoped target universe such as favorites/watchlist/sample portfolios.

create table if not exists public.universe_members (
  id uuid primary key default gen_random_uuid(),
  symbol_id uuid not null references public.symbols(id) on delete cascade,
  universe_type text not null default 'favorites',
  source text,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists universe_members_symbol_type_idx
  on public.universe_members (symbol_id, universe_type);

create index if not exists universe_members_type_enabled_idx
  on public.universe_members (universe_type, is_enabled);

alter table public.universe_members enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'universe_members'
      and policyname = 'universe_members_service_role_all'
  ) then
    create policy universe_members_service_role_all
      on public.universe_members
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
