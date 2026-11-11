-- Numflash — migration initiale
-- Schéma de base : enums, tables, RLS, fonction get_balance, vue user_balances, seed settings.

create extension if not exists pgcrypto;

-- =========================================================================
-- Enums
-- =========================================================================

create type public.transaction_type as enum (
  'topup', 'purchase', 'refund', 'bonus', 'adjustment'
);

create type public.order_status as enum (
  'pending', 'received', 'finished', 'canceled', 'timeout', 'banned', 'refunded'
);

create type public.topup_status as enum (
  'pending', 'succeeded', 'failed', 'expired'
);

-- =========================================================================
-- Tables
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  full_name text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.countries (
  code text primary key,
  name_fr text not null,
  flag_emoji text,
  is_active boolean not null default true
);

create table public.services (
  slug text primary key,
  name_fr text not null,
  logo_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  margin_override numeric(5,4)
);

create table public.price_cache (
  service_slug text not null references public.services(slug) on delete cascade,
  country_code text not null references public.countries(code) on delete cascade,
  operator text not null,
  cost_usd numeric(10,4) not null check (cost_usd >= 0),
  stock integer not null default 0 check (stock >= 0),
  synced_at timestamptz not null default now(),
  primary key (service_slug, country_code, operator)
);

create table public.topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_xof integer not null check (amount_xof > 0),
  saspay_payment_id text unique,
  status public.topup_status not null default 'pending',
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index on public.topups (user_id, created_at desc);
create index on public.topups (status) where status = 'pending';

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fivesim_order_id bigint unique,
  phone text not null,
  service_slug text not null references public.services(slug),
  country_code text not null references public.countries(code),
  operator text,
  price_xof integer not null check (price_xof > 0),
  cost_usd numeric(10,4) not null check (cost_usd >= 0),
  status public.order_status not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.orders (user_id, created_at desc);
create index on public.orders (status) where status in ('pending', 'received');

create table public.order_sms (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender text,
  text text,
  code text,
  received_at timestamptz not null default now()
);
create index on public.order_sms (order_id, received_at);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.transaction_type not null,
  amount_xof integer not null,
  order_id uuid references public.orders(id),
  topup_id uuid references public.topups(id),
  note text,
  created_at timestamptz not null default now(),
  constraint wallet_amount_not_zero check (amount_xof <> 0),
  constraint wallet_ref_coherent check (
    (type = 'topup'     and topup_id is not null and order_id is null)
    or (type in ('purchase','refund') and order_id is not null and topup_id is null)
    or (type in ('bonus','adjustment') and order_id is null and topup_id is null)
  )
);
create index on public.wallet_transactions (user_id, created_at desc);
create index on public.wallet_transactions (order_id) where order_id is not null;
create index on public.wallet_transactions (topup_id) where topup_id is not null;

create table public.settings (
  key text primary key,
  value jsonb not null
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text not null,
  target text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log (created_at desc);
create index on public.audit_log (target) where target is not null;

-- =========================================================================
-- Append-only : wallet_transactions ne peut jamais être modifiée ni supprimée.
-- =========================================================================

create function public.wallet_transactions_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'wallet_transactions is append-only' using errcode = '42501';
end;
$$;

create trigger wallet_tx_no_update
  before update on public.wallet_transactions
  for each row execute function public.wallet_transactions_append_only();

create trigger wallet_tx_no_delete
  before delete on public.wallet_transactions
  for each row execute function public.wallet_transactions_append_only();

-- =========================================================================
-- Auto-création du profil à l'inscription.
-- Les champs full_name et phone arrivent via raw_user_meta_data (signUp options.data).
-- =========================================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Solde : fonction get_balance(uid) et vue user_balances.
-- SECURITY INVOKER + RLS garantissent qu'un utilisateur ne voit que son propre solde.
-- =========================================================================

create function public.get_balance(uid uuid)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(amount_xof), 0)::integer
  from public.wallet_transactions
  where user_id = uid;
$$;

create view public.user_balances
with (security_invoker = true)
as
select
  user_id,
  coalesce(sum(amount_xof), 0)::integer as balance_xof,
  max(created_at) as last_movement_at
from public.wallet_transactions
group by user_id;

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.profiles            enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.topups              enable row level security;
alter table public.orders              enable row level security;
alter table public.order_sms           enable row level security;
alter table public.countries           enable row level security;
alter table public.services            enable row level security;
alter table public.price_cache         enable row level security;
alter table public.settings            enable row level security;
alter table public.audit_log           enable row level security;

-- Lecture limitée au propriétaire. Aucune policy d'écriture : seul service_role bypasse.
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

create policy wallet_tx_select_own on public.wallet_transactions
  for select using (user_id = auth.uid());

create policy topups_select_own on public.topups
  for select using (user_id = auth.uid());

create policy orders_select_own on public.orders
  for select using (user_id = auth.uid());

create policy order_sms_select_own on public.order_sms
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_sms.order_id and o.user_id = auth.uid()
    )
  );

-- Lecture publique (listing côté client pour afficher pays, services et prix).
create policy countries_public_read on public.countries
  for select using (true);

create policy services_public_read on public.services
  for select using (true);

create policy price_cache_public_read on public.price_cache
  for select using (true);

-- settings et audit_log : aucune policy → service_role uniquement.

-- =========================================================================
-- Grants
-- =========================================================================

grant select on public.profiles            to authenticated;
grant select on public.wallet_transactions to authenticated;
grant select on public.topups              to authenticated;
grant select on public.orders              to authenticated;
grant select on public.order_sms           to authenticated;
grant select on public.countries           to anon, authenticated;
grant select on public.services            to anon, authenticated;
grant select on public.price_cache         to anon, authenticated;
grant select on public.user_balances       to authenticated;
grant execute on function public.get_balance(uuid) to authenticated;

-- =========================================================================
-- Seed settings
-- =========================================================================

insert into public.settings (key, value) values
  ('fx_usd_xof',                to_jsonb(600::numeric)),
  ('margin_rate',               to_jsonb(0.30::numeric)),
  ('rounding_step',             to_jsonb(100)),
  ('price_floor_xof',           to_jsonb(150)),
  ('topup_tiers',               '[500, 1000, 2000, 5000, 10000, 20000]'::jsonb),
  ('max_cancels_per_hour',      to_jsonb(5)),
  ('min_seconds_before_cancel', to_jsonb(120)),
  ('max_active_orders',         to_jsonb(5));
