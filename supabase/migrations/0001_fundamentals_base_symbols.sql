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
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
