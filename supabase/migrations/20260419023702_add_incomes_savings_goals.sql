-- Tabla de ingresos por usuario
create table public.incomes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     numeric(12,2) not null check (amount > 0),
  label      text not null default 'Ingreso',
  month      date not null,
  recurring  boolean default false,
  created_at timestamptz default now()
);

alter table public.incomes enable row level security;

create policy "incomes_own" on public.incomes
  for all using (user_id = auth.uid());

create index idx_incomes_user_month
  on public.incomes(user_id, month);

-- Tabla de objetivos de ahorro
create table public.savings_goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  target_pct int not null default 70 check (target_pct between 1 and 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.savings_goals enable row level security;

create policy "savings_goals_own" on public.savings_goals
  for all using (user_id = auth.uid());

-- Registrar migración
insert into public.schema_migrations (version, name) values
  ('20250101000003', 'add_incomes_savings_goals')
on conflict do nothing;