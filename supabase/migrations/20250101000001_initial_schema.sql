-- =============================================================
-- AHORRAPP — Migración 001: Schema inicial
-- Convención: YYYYMMDDHHMMSS_descripcion.sql
-- REGLA DE ORO: Esta migración solo AGREGA cosas. Nunca
-- modifica ni elimina columnas existentes en producción.
-- =============================================================

-- Habilitar extensiones necesarias
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm"; -- para búsqueda fuzzy en comercios

-- =============================================================
-- TABLA: profiles
-- Extiende auth.users de Supabase. Uno por usuario.
-- =============================================================
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  full_name      text,
  whatsapp_number text unique,          -- '+5491112345678' — para identificar mensajes entrantes
  whatsapp_verified boolean default false,
  gmail_connected boolean default false,
  gmail_refresh_token text,             -- encriptado en aplicación, nunca expuesto en API
  onboarding_completed boolean default false,
  timezone       text default 'America/Argentina/Buenos_Aires',
  currency       text default 'ARS',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

comment on table public.profiles is 'Perfil extendido de cada usuario de Ahorrapp';
comment on column public.profiles.gmail_refresh_token is 'Token OAuth2 de Gmail. Encriptado con AES-256 antes de persistir.';

-- =============================================================
-- TABLA: categories
-- Categorías por usuario + categorías del sistema (user_id null)
-- =============================================================
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  name        text not null,
  icon        text not null default '📦',
  color       text not null default '#94a3b8',
  is_system   boolean default false,   -- true = categoría global para todos los usuarios
  sort_order  int default 0,
  created_at  timestamptz default now(),

  constraint categories_name_per_user unique (user_id, name)
);

comment on column public.categories.user_id is 'NULL = categoría del sistema disponible para todos';

-- =============================================================
-- TABLA: payment_methods
-- Tarjetas y cuentas de cada usuario
-- =============================================================
create table public.payment_methods (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null,                -- 'Visa Galicia', 'Débito Santander'
  last_four       char(4),                      -- últimos 4 dígitos
  bank            text,                         -- 'Galicia', 'Santander', 'MP'
  email_origin    text,                         -- para matching de emails bancarios
  is_default      boolean default false,
  color           text default '#7c6dfa',
  created_at      timestamptz default now(),

  constraint payment_methods_name_per_user unique (user_id, name)
);

-- =============================================================
-- TABLA: transactions
-- Core de la app. Todos los gastos de todos los usuarios.
-- CRÍTICO: user_id en EVERY row para garantizar aislamiento.
-- =============================================================
create table public.transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  amount          numeric(12, 2) not null check (amount > 0),
  merchant        text not null default 'Sin descripción',
  category_id     uuid references public.categories(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  date            date not null default current_date,
  source          text not null default 'manual'
                  check (source in ('manual', 'email', 'whatsapp', 'csv', 'import')),
  notes           text,
  raw_email_id    text,          -- Message-ID del email original para deduplicación
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  -- Índice de deduplicación: mismo usuario, email, monto y fecha → no duplicar
  constraint transactions_dedup_email unique (user_id, raw_email_id)
    deferrable initially deferred
);

-- Índices para performance en queries frecuentes
create index idx_transactions_user_date
  on public.transactions(user_id, date desc);

create index idx_transactions_user_category
  on public.transactions(user_id, category_id);


create index idx_transactions_merchant_trgm
  on public.transactions using gin(merchant gin_trgm_ops);

comment on table public.transactions is 'Tabla central de gastos. NUNCA eliminar columnas sin migración expand-contract.';
comment on column public.transactions.raw_email_id is 'Message-ID del email para evitar importar el mismo email dos veces.';

-- =============================================================
-- TABLA: budgets
-- Presupuesto mensual por categoría por usuario
-- =============================================================
create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  amount        numeric(12, 2) not null check (amount > 0),
  alert_pct     numeric(4, 2) default 0.90 check (alert_pct between 0 and 1),
  active        boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),

  constraint budgets_unique_category unique (user_id, category_id)
);

-- =============================================================
-- TABLA: whatsapp_sessions
-- Estado de conversaciones WhatsApp pendientes de confirmación
-- =============================================================
create table public.whatsapp_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  phone_number  text not null,
  pending_data  jsonb not null,          -- datos del gasto a confirmar
  expires_at    timestamptz not null default (now() + interval '10 minutes'),
  created_at    timestamptz default now()
);

create index idx_whatsapp_sessions_phone
  on public.whatsapp_sessions(phone_number, expires_at);

-- =============================================================
-- TABLA: email_sync_log
-- Registro de sincronizaciones de Gmail por usuario
-- =============================================================
create table public.email_sync_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  synced_at     timestamptz default now(),
  emails_found  int default 0,
  emails_parsed int default 0,
  emails_failed int default 0,
  last_email_date timestamptz,
  error_message text
);

create index idx_email_sync_user
  on public.email_sync_log(user_id, synced_at desc);

-- =============================================================
-- TABLA: schema_migrations
-- Control interno de migraciones aplicadas
-- =============================================================
create table public.schema_migrations (
  version     text primary key,
  name        text not null,
  applied_at  timestamptz default now(),
  checksum    text                      -- SHA256 del archivo para detectar tampering
);

insert into public.schema_migrations (version, name) values
  ('20250101000001', 'initial_schema');

-- =============================================================
-- ROW LEVEL SECURITY — el corazón del multi-tenant
-- Garantiza que NINGÚN usuario pueda ver datos de otro,
-- incluso si hay un bug en la aplicación.
-- =============================================================

alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.payment_methods  enable row level security;
alter table public.transactions     enable row level security;
alter table public.budgets          enable row level security;
alter table public.whatsapp_sessions enable row level security;
alter table public.email_sync_log   enable row level security;

-- profiles: cada usuario ve y modifica solo el suyo
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id);

-- categories: ve las propias + las del sistema
create policy "categories_read" on public.categories
  for select using (user_id = auth.uid() or is_system = true);

create policy "categories_write" on public.categories
  for all using (user_id = auth.uid());

-- payment_methods: solo las propias
create policy "payment_methods_own" on public.payment_methods
  for all using (user_id = auth.uid());

-- transactions: solo las propias
create policy "transactions_own" on public.transactions
  for all using (user_id = auth.uid());

-- budgets: solo los propios
create policy "budgets_own" on public.budgets
  for all using (user_id = auth.uid());

-- whatsapp_sessions: solo las propias
create policy "whatsapp_sessions_own" on public.whatsapp_sessions
  for all using (user_id = auth.uid());

-- email_sync_log: solo los propios
create policy "email_sync_log_own" on public.email_sync_log
  for all using (user_id = auth.uid());

-- =============================================================
-- SERVICE ROLE POLICY — para el backend de la app
-- El backend usa service_role key que bypasea RLS.
-- SOLO para operaciones internas (webhooks Twilio, cron jobs).
-- =============================================================

-- =============================================================
-- FUNCIONES DE UTILIDAD
-- =============================================================

-- Trigger para actualizar updated_at automáticamente
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_transactions
  before update on public.transactions
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_budgets
  before update on public.budgets
  for each row execute function public.handle_updated_at();

-- Función: crear profile automáticamente cuando se registra un usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Función: obtener resumen mensual de un usuario (optimizada)
create or replace function public.get_monthly_summary(
  p_user_id uuid,
  p_month   date  -- primer día del mes, ej: '2025-04-01'
)
returns table(
  category_id   uuid,
  category_name text,
  category_icon text,
  category_color text,
  total         numeric,
  tx_count      bigint,
  budget_amount numeric,
  budget_pct    numeric
) language sql security definer as $$
  select
    c.id,
    c.name,
    c.icon,
    c.color,
    coalesce(sum(t.amount), 0)       as total,
    count(t.id)                       as tx_count,
    b.amount                          as budget_amount,
    case
      when b.amount > 0
      then round(coalesce(sum(t.amount), 0) / b.amount * 100, 1)
      else null
    end                               as budget_pct
  from public.categories c
  left join public.transactions t
    on t.category_id = c.id
    and t.user_id = p_user_id
    and date_trunc('month', t.date) = date_trunc('month', p_month)
  left join public.budgets b
    on b.category_id = c.id
    and b.user_id = p_user_id
    and b.active = true
  where (c.user_id = p_user_id or c.is_system = true)
  group by c.id, c.name, c.icon, c.color, b.amount
  having coalesce(sum(t.amount), 0) > 0 or b.amount is not null
  order by total desc nulls last;
$$;