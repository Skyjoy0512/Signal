-- GUI-managed LLM provider settings.

create table if not exists public.llm_settings (
  id text primary key default 'default',
  provider text not null default 'deepseek',
  base_url text,
  reasoning_model text not null default 'deepseek-chat',
  worker_model text not null default 'deepseek-chat',
  critic_model text not null default 'deepseek-chat',
  reasoning_temperature numeric not null default 0.3,
  critic_temperature numeric not null default 0.5,
  enable_critic boolean not null default false,
  api_key_ciphertext text,
  api_key_preview text,
  input_cost_per_million numeric not null default 0,
  output_cost_per_million numeric not null default 0,
  daily_cost_limit_usd numeric not null default 3,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.llm_settings enable row level security;

grant select, insert, update, delete on table public.llm_settings to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'llm_settings'
      and policyname = 'llm_settings_service_role_all'
  ) then
    create policy llm_settings_service_role_all
      on public.llm_settings
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;
