-- Phase 4 : administration et anti-abus.
-- Les écritures d'administration passent par des RPC SECURITY DEFINER qui vérifient le rôle,
-- valident les entrées, s'exécutent dans une transaction et journalisent dans audit_log.
-- L'anti-abus vit dans des déclencheurs sur orders : aucun chemin applicatif ne peut le contourner.

-- =========================================================================
-- Rôle administrateur
-- =========================================================================

create type public.user_role as enum ('user', 'admin');

-- Les clients n'ont aucun droit d'écriture sur profiles : le rôle ne peut pas être auto-attribué.
alter table public.profiles add column role public.user_role not null default 'user';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not is_blocked
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NF_FORBIDDEN' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

-- IP, user-agent et identifiant de requête, lus dans les en-têtes transmis par PostgREST.
create or replace function public.request_meta()
returns jsonb
language sql
volatile
set search_path = public
as $$
  with h as (select nullif(current_setting('request.headers', true), '')::jsonb as headers)
  select jsonb_build_object(
    'ip', nullif(trim(split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    'user_agent', headers ->> 'user-agent',
    'request_id', coalesce(headers ->> 'x-request-id', gen_random_uuid()::text)
  )
  from h;
$$;

revoke execute on function public.require_admin() from public, anon, authenticated;
revoke execute on function public.request_meta() from public, anon, authenticated;

-- =========================================================================
-- Lecture admin (RLS). Les politiques « propriétaire » existantes restent en place.
-- =========================================================================

create policy profiles_admin_select on public.profiles
  for select using ((select public.is_admin()));
create policy wallet_tx_admin_select on public.wallet_transactions
  for select using ((select public.is_admin()));
create policy topups_admin_select on public.topups
  for select using ((select public.is_admin()));
create policy orders_admin_select on public.orders
  for select using ((select public.is_admin()));
create policy order_sms_admin_select on public.order_sms
  for select using ((select public.is_admin()));
create policy audit_log_admin_select on public.audit_log
  for select using ((select public.is_admin()));
create policy settings_admin_select on public.settings
  for select using ((select public.is_admin()));

grant select on public.audit_log to authenticated;
grant select on public.settings to authenticated;

-- =========================================================================
-- Réglages
-- =========================================================================

insert into public.settings (key, value) values
  ('fivesim_low_balance_threshold', to_jsonb(10::numeric)),
  ('cancel_ratio_alert_threshold', to_jsonb(0.60::numeric)),
  ('cancel_ratio_window', to_jsonb(20)),
  ('report_timezone', to_jsonb('Africa/Lagos'::text))
on conflict (key) do nothing;

create or replace function public.setting_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value #>> '{}')::integer from public.settings where key = p_key), p_default);
$$;

create or replace function public.setting_numeric(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value #>> '{}')::numeric from public.settings where key = p_key), p_default);
$$;

create or replace function public.setting_text(p_key text, p_default text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value #>> '{}' from public.settings where key = p_key), p_default);
$$;

revoke execute on function public.setting_int(text, integer) from public, anon, authenticated;
revoke execute on function public.setting_numeric(text, numeric) from public, anon, authenticated;
revoke execute on function public.setting_text(text, text) from public, anon, authenticated;

-- Décimal positif à 4 décimales maximum (taux, coûts) : jamais de flottant.
create or replace function public.jsonb_decimal(p_label text, p_value jsonb, p_min numeric, p_max numeric)
returns numeric
language plpgsql
immutable
as $$
declare
  v_text text;
  v numeric;
begin
  if p_value is null or jsonb_typeof(p_value) not in ('number', 'string') then
    raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_label;
  end if;
  v_text := trim(p_value #>> '{}');
  if v_text !~ '^\d+(\.\d{1,4})?$' then
    raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_label;
  end if;
  v := v_text::numeric;
  if v < p_min or v > p_max then
    raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_label;
  end if;
  return v;
end;
$$;

create or replace function public.jsonb_int(p_label text, p_value jsonb, p_min integer, p_max integer)
returns integer
language plpgsql
immutable
as $$
declare
  v_text text;
  v bigint;
begin
  if p_value is null or jsonb_typeof(p_value) not in ('number', 'string') then
    raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_label;
  end if;
  v_text := trim(p_value #>> '{}');
  if v_text !~ '^\d{1,10}$' then
    raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_label;
  end if;
  v := v_text::bigint;
  if v < p_min or v > p_max then
    raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_label;
  end if;
  return v::integer;
end;
$$;

-- Valide et normalise la valeur d'un réglage connu. Toute clé inconnue est refusée.
create or replace function public.validate_setting(p_key text, p_value jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_tiers jsonb;
  v_text text;
begin
  case p_key
    when 'fx_usd_xof' then return to_jsonb(public.jsonb_decimal(p_key, p_value, 0.0001, 100000));
    when 'margin_rate' then return to_jsonb(public.jsonb_decimal(p_key, p_value, 0, 5));
    when 'rounding_step' then return to_jsonb(public.jsonb_int(p_key, p_value, 1, 10000));
    when 'price_floor_xof' then return to_jsonb(public.jsonb_int(p_key, p_value, 0, 1000000));
    when 'max_cancels_per_hour' then return to_jsonb(public.jsonb_int(p_key, p_value, 0, 1000));
    when 'min_seconds_before_cancel' then return to_jsonb(public.jsonb_int(p_key, p_value, 0, 3600));
    when 'max_active_orders' then return to_jsonb(public.jsonb_int(p_key, p_value, 1, 100));
    when 'fivesim_low_balance_threshold' then return to_jsonb(public.jsonb_decimal(p_key, p_value, 0, 1000000));
    when 'cancel_ratio_alert_threshold' then return to_jsonb(public.jsonb_decimal(p_key, p_value, 0, 1));
    when 'cancel_ratio_window' then return to_jsonb(public.jsonb_int(p_key, p_value, 5, 200));
    when 'topup_tiers' then
      if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) not between 1 and 12 then
        raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_key;
      end if;
      select jsonb_agg(t order by t) into v_tiers
      from (select distinct public.jsonb_int(p_key, e, 100, 1000000) as t from jsonb_array_elements(p_value) e) s;
      if jsonb_array_length(v_tiers) <> jsonb_array_length(p_value) then
        raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_key;
      end if;
      return v_tiers;
    when 'report_timezone' then
      if jsonb_typeof(p_value) <> 'string' then
        raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_key;
      end if;
      v_text := trim(p_value #>> '{}');
      if not exists (select 1 from pg_timezone_names where name = v_text) then
        raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_key;
      end if;
      return to_jsonb(v_text);
    else
      raise exception 'NF_UNKNOWN_SETTING' using errcode = '22023', detail = p_key;
  end case;
end;
$$;

revoke execute on function public.jsonb_decimal(text, jsonb, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.jsonb_int(text, jsonb, integer, integer) from public, anon, authenticated;
revoke execute on function public.validate_setting(text, jsonb) from public, anon, authenticated;

create or replace function public.admin_update_settings(p_changes jsonb, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_key text;
  v_value jsonb;
  v_old jsonb;
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then
    raise exception 'NF_INVALID_INPUT' using errcode = '22023';
  end if;

  for v_key, v_value in select key, value from jsonb_each(p_changes) loop
    v_value := public.validate_setting(v_key, v_value);
    select value into v_old from public.settings where key = v_key for update;
    if v_old is distinct from v_value then
      insert into public.settings (key, value) values (v_key, v_value)
      on conflict (key) do update set value = excluded.value;
      v_before := v_before || jsonb_build_object(v_key, v_old);
      v_after := v_after || jsonb_build_object(v_key, v_value);
    end if;
  end loop;

  if v_after <> '{}'::jsonb then
    insert into public.audit_log (actor, action, target, payload)
    values ('admin:' || v_admin, 'settings_updated', 'settings',
            public.request_meta() || jsonb_build_object(
              'before', v_before, 'after', v_after, 'reason', nullif(trim(coalesce(p_reason, '')), '')));
  end if;

  return jsonb_build_object('updated', v_after);
end;
$$;

-- =========================================================================
-- Catalogue : services et pays
-- =========================================================================

create or replace function public.admin_update_service(p_slug text, p_patch jsonb)
returns public.services
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_old public.services%rowtype;
  v_new public.services%rowtype;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb
     or exists (select 1 from jsonb_object_keys(p_patch) k
                where k not in ('is_active', 'name_fr', 'margin_override', 'sort_order')) then
    raise exception 'NF_INVALID_INPUT' using errcode = '22023';
  end if;

  select * into v_old from public.services where slug = p_slug for update;
  if not found then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;
  v_new := v_old;

  if p_patch ? 'is_active' then
    if jsonb_typeof(p_patch -> 'is_active') <> 'boolean' then
      raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = 'is_active';
    end if;
    v_new.is_active := (p_patch ->> 'is_active')::boolean;
  end if;
  if p_patch ? 'name_fr' then
    v_new.name_fr := trim(coalesce(p_patch ->> 'name_fr', ''));
    if length(v_new.name_fr) not between 1 and 80 then
      raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = 'name_fr';
    end if;
  end if;
  if p_patch ? 'margin_override' then
    v_new.margin_override := case
      when jsonb_typeof(p_patch -> 'margin_override') = 'null' then null
      else public.jsonb_decimal('margin_override', p_patch -> 'margin_override', 0, 5)
    end;
  end if;
  if p_patch ? 'sort_order' then
    v_new.sort_order := public.jsonb_int('sort_order', p_patch -> 'sort_order', 0, 10000);
  end if;

  update public.services
     set is_active = v_new.is_active,
         name_fr = v_new.name_fr,
         margin_override = v_new.margin_override,
         sort_order = v_new.sort_order
   where slug = p_slug
  returning * into v_new;

  insert into public.audit_log (actor, action, target, payload)
  values ('admin:' || v_admin, 'service_updated', 'service:' || p_slug,
          public.request_meta() || jsonb_build_object('before', to_jsonb(v_old), 'after', to_jsonb(v_new)));

  return v_new;
end;
$$;

create or replace function public.admin_update_country(p_code text, p_patch jsonb)
returns public.countries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_old public.countries%rowtype;
  v_new public.countries%rowtype;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb
     or exists (select 1 from jsonb_object_keys(p_patch) k where k not in ('is_active', 'name_fr')) then
    raise exception 'NF_INVALID_INPUT' using errcode = '22023';
  end if;

  select * into v_old from public.countries where code = p_code for update;
  if not found then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;
  v_new := v_old;

  if p_patch ? 'is_active' then
    if jsonb_typeof(p_patch -> 'is_active') <> 'boolean' then
      raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = 'is_active';
    end if;
    v_new.is_active := (p_patch ->> 'is_active')::boolean;
  end if;
  if p_patch ? 'name_fr' then
    v_new.name_fr := trim(coalesce(p_patch ->> 'name_fr', ''));
    if length(v_new.name_fr) not between 1 and 80 then
      raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = 'name_fr';
    end if;
  end if;

  update public.countries
     set is_active = v_new.is_active, name_fr = v_new.name_fr
   where code = p_code
  returning * into v_new;

  insert into public.audit_log (actor, action, target, payload)
  values ('admin:' || v_admin, 'country_updated', 'country:' || p_code,
          public.request_meta() || jsonb_build_object('before', to_jsonb(v_old), 'after', to_jsonb(v_new)));

  return v_new;
end;
$$;

-- =========================================================================
-- Utilisateurs : blocage et ajustement de solde
-- =========================================================================

create or replace function public.admin_set_user_blocked(p_user_id uuid, p_blocked boolean, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_before boolean;
begin
  if p_user_id = v_admin then
    raise exception 'NF_CANNOT_TARGET_SELF' using errcode = '22023';
  end if;
  if p_blocked is null then
    raise exception 'NF_INVALID_INPUT' using errcode = '22023';
  end if;
  if p_blocked and (v_reason is null or length(v_reason) < 5) then
    raise exception 'NF_REASON_REQUIRED' using errcode = '22023';
  end if;

  select is_blocked into v_before from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_before is distinct from p_blocked then
    update public.profiles set is_blocked = p_blocked where id = p_user_id;
    insert into public.audit_log (actor, action, target, payload)
    values ('admin:' || v_admin, case when p_blocked then 'user_blocked' else 'user_unblocked' end,
            'user:' || p_user_id, public.request_meta() || jsonb_build_object('reason', v_reason));
  end if;

  return jsonb_build_object('user_id', p_user_id, 'is_blocked', p_blocked);
end;
$$;

-- Toute opération qui débite un wallet verrouille d'abord profiles(id) : les débits d'un même
-- utilisateur sont ainsi sérialisés et le solde ne peut pas passer sous zéro par concurrence.
create or replace function public.admin_adjust_balance(p_user_id uuid, p_amount_xof integer, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_before integer;
  v_tx_id uuid;
begin
  if p_user_id = v_admin then
    raise exception 'NF_CANNOT_TARGET_SELF' using errcode = '22023';
  end if;
  if p_amount_xof is null or p_amount_xof = 0 or abs(p_amount_xof) > 10000000 then
    raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = 'amount_xof';
  end if;
  if v_reason is null or length(v_reason) < 5 or length(v_reason) > 500 then
    raise exception 'NF_REASON_REQUIRED' using errcode = '22023';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_before := public.get_balance(p_user_id);
  if v_before + p_amount_xof < 0 then
    raise exception 'NF_INSUFFICIENT_BALANCE' using errcode = '22023',
      detail = jsonb_build_object('balance_xof', v_before)::text;
  end if;

  insert into public.wallet_transactions (user_id, type, amount_xof, note)
  values (p_user_id, 'adjustment', p_amount_xof, v_reason)
  returning id into v_tx_id;

  insert into public.audit_log (actor, action, target, payload)
  values ('admin:' || v_admin, 'balance_adjusted', 'user:' || p_user_id,
          public.request_meta() || jsonb_build_object(
            'amount_xof', p_amount_xof,
            'reason', v_reason,
            'balance_before', v_before,
            'balance_after', v_before + p_amount_xof,
            'wallet_transaction_id', v_tx_id));

  return jsonb_build_object(
    'wallet_transaction_id', v_tx_id,
    'balance_before', v_before,
    'balance_after', v_before + p_amount_xof);
end;
$$;

create or replace function public.admin_list_users(p_search text default null, p_limit integer default 25, p_offset integer default 0)
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  role public.user_role,
  is_blocked boolean,
  created_at timestamptz,
  balance_xof integer,
  orders_total integer,
  recent_sample integer,
  recent_user_cancels integer,
  cancel_ratio numeric,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_pattern text;
  v_window integer := public.setting_int('cancel_ratio_window', 20);
begin
  perform public.require_admin();
  if v_search is not null then
    v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
  with filtered as (
    select p.*, u.email::text as user_email
    from public.profiles p
    join auth.users u on u.id = p.id
    where v_search is null
       or u.email ilike v_pattern
       or p.full_name ilike v_pattern
       or p.phone ilike v_pattern
       or p.id::text = v_search
  )
  select
    f.id, f.user_email, f.full_name, f.phone, f.role, f.is_blocked, f.created_at,
    coalesce(b.balance, 0)::integer,
    coalesce(o.total, 0)::integer,
    coalesce(r.sample, 0)::integer,
    coalesce(r.canceled, 0)::integer,
    case when coalesce(r.sample, 0) > 0 then round(r.canceled::numeric / r.sample, 4) end,
    count(*) over ()
  from filtered f
  left join lateral (select sum(w.amount_xof) as balance from public.wallet_transactions w where w.user_id = f.id) b on true
  left join lateral (select count(*) as total from public.orders o2 where o2.user_id = f.id) o on true
  left join lateral (
    select count(*) as sample, count(*) filter (where x.canceled_by = 'user') as canceled
    from (select o3.canceled_by from public.orders o3 where o3.user_id = f.id
          order by o3.created_at desc limit v_window) x
  ) r on true
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

-- =========================================================================
-- Tableau de bord
-- =========================================================================

alter table public.orders add column fx_usd_xof numeric(10,4);

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text := public.setting_text('report_timezone', 'Africa/Lagos');
  v_fx numeric := public.setting_numeric('fx_usd_xof', 600);
  v_start timestamptz;
  v_end timestamptz;
  v_orders integer;
  v_success integer;
  v_finalized integer;
  v_revenue bigint;
  v_cost bigint;
  v_topups bigint;
  v_alerts integer;
  v_last_reconcile jsonb;
begin
  perform public.require_admin();
  v_start := date_trunc('day', now() at time zone v_tz) at time zone v_tz;
  v_end := v_start + interval '1 day';

  -- CA = ventes conservées (SMS reçu). Coût converti au taux figé à l'achat, sinon au taux courant.
  select count(*),
         count(*) filter (where status in ('received', 'finished')),
         count(*) filter (where status <> 'pending'),
         coalesce(sum(price_xof) filter (where status in ('received', 'finished')), 0),
         coalesce(sum(round(cost_usd * coalesce(fx_usd_xof, v_fx))) filter (where status in ('received', 'finished')), 0)
    into v_orders, v_success, v_finalized, v_revenue, v_cost
    from public.orders
   where created_at >= v_start and created_at < v_end;

  select coalesce(sum(amount_xof), 0) into v_topups
    from public.wallet_transactions
   where type = 'topup' and created_at >= v_start and created_at < v_end;

  select count(*) into v_alerts
    from public.audit_log
   where action = 'abuse_cancel_ratio_alert' and created_at > now() - interval '24 hours';

  select jsonb_build_object('at', created_at, 'action', action, 'summary', payload -> 'summary', 'trigger', payload -> 'trigger')
    into v_last_reconcile
    from public.audit_log
   where actor = 'edge:reconcile' and action in ('reconcile_report', 'reconcile_failed', 'reconcile_skipped')
   order by created_at desc
   limit 1;

  return jsonb_build_object(
    'timezone', v_tz,
    'day_start', v_start,
    'orders_count', v_orders,
    'success_count', v_success,
    'finalized_count', v_finalized,
    'success_rate', case when v_finalized > 0 then round(v_success::numeric / v_finalized, 4) end,
    'revenue_xof', v_revenue,
    'cost_xof', v_cost,
    'gross_margin_xof', v_revenue - v_cost,
    'topups_xof', v_topups,
    'abuse_alerts_24h', v_alerts,
    'last_reconcile', v_last_reconcile
  );
end;
$$;

revoke execute on function public.admin_update_settings(jsonb, text) from public, anon;
revoke execute on function public.admin_update_service(text, jsonb) from public, anon;
revoke execute on function public.admin_update_country(text, jsonb) from public, anon;
revoke execute on function public.admin_set_user_blocked(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_adjust_balance(uuid, integer, text) from public, anon;
revoke execute on function public.admin_list_users(text, integer, integer) from public, anon;
revoke execute on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_update_settings(jsonb, text) to authenticated;
grant execute on function public.admin_update_service(text, jsonb) to authenticated;
grant execute on function public.admin_update_country(text, jsonb) to authenticated;
grant execute on function public.admin_set_user_blocked(uuid, boolean, text) to authenticated;
grant execute on function public.admin_adjust_balance(uuid, integer, text) to authenticated;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;

-- =========================================================================
-- Anti-abus sur orders (côté base uniquement)
-- =========================================================================

alter table public.orders
  add column updated_at timestamptz not null default now(),
  add column canceled_at timestamptz,
  add column canceled_by text check (canceled_by in ('user', 'system', 'admin')),
  add constraint orders_canceled_by_required check (status <> 'canceled' or canceled_by is not null);

create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_user_canceled_idx on public.orders (user_id, canceled_at desc) where canceled_by = 'user';

-- Achat : compte non bloqué et plafond de commandes en attente.
-- Le verrou sur profiles sérialise les achats concurrents d'un même utilisateur.
create or replace function public.orders_guard_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocked boolean;
  v_active integer;
  v_max integer := public.setting_int('max_active_orders', 5);
begin
  select is_blocked into v_blocked from public.profiles where id = new.user_id for update;
  if not found then
    raise exception 'NF_PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_blocked then
    raise exception 'NF_ACCOUNT_BLOCKED' using errcode = 'P0001';
  end if;

  select count(*) into v_active from public.orders where user_id = new.user_id and status = 'pending';
  if v_active >= v_max then
    raise exception 'NF_MAX_ACTIVE_ORDERS' using errcode = 'P0001',
      detail = jsonb_build_object('active', v_active, 'max', v_max)::text;
  end if;
  return new;
end;
$$;

-- Annulation par l'utilisateur : délai minimum et plafond horaire.
-- Les annulations système ou admin (canceled_by) ne sont pas limitées.
create or replace function public.orders_guard_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min_seconds integer;
  v_max_per_hour integer;
  v_elapsed numeric;
  v_recent integer;
begin
  new.updated_at := now();

  if new.status = 'canceled' and old.status is distinct from 'canceled' then
    if new.canceled_by is null then
      raise exception 'NF_CANCELED_BY_REQUIRED' using errcode = 'P0001';
    end if;
    new.canceled_at := coalesce(new.canceled_at, now());

    if new.canceled_by = 'user' then
      if old.status <> 'pending' then
        raise exception 'NF_CANCEL_NOT_PENDING' using errcode = 'P0001';
      end if;

      v_min_seconds := public.setting_int('min_seconds_before_cancel', 120);
      v_elapsed := extract(epoch from now() - old.created_at);
      if v_elapsed < v_min_seconds then
        raise exception 'NF_CANCEL_TOO_EARLY' using errcode = 'P0001',
          detail = jsonb_build_object('retry_after_seconds', ceil(v_min_seconds - v_elapsed))::text;
      end if;

      v_max_per_hour := public.setting_int('max_cancels_per_hour', 5);
      perform 1 from public.profiles where id = new.user_id for update;
      select count(*) into v_recent
        from public.orders
       where user_id = new.user_id and canceled_by = 'user' and canceled_at > now() - interval '1 hour';
      if v_recent >= v_max_per_hour then
        raise exception 'NF_CANCEL_LIMIT_REACHED' using errcode = 'P0001',
          detail = jsonb_build_object('max', v_max_per_hour)::text;
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Alerte (sans blocage automatique) si plus de 60 % des dernières commandes ont été annulées
-- par l'utilisateur. Calculée dès que la moitié de la fenêtre est atteinte, une fois par 24 h.
create or replace function public.orders_cancel_ratio_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window integer := public.setting_int('cancel_ratio_window', 20);
  v_threshold numeric := public.setting_numeric('cancel_ratio_alert_threshold', 0.60);
  v_total integer;
  v_canceled integer;
  v_ratio numeric;
begin
  select count(*), count(*) filter (where recent.canceled_by = 'user')
    into v_total, v_canceled
    from (select o.canceled_by from public.orders o
          where o.user_id = new.user_id order by o.created_at desc limit v_window) recent;

  if v_total < ceil(v_window / 2.0) then
    return null;
  end if;
  v_ratio := round(v_canceled::numeric / v_total, 4);
  if v_ratio <= v_threshold then
    return null;
  end if;
  if exists (select 1 from public.audit_log
             where action = 'abuse_cancel_ratio_alert' and target = 'user:' || new.user_id
               and created_at > now() - interval '24 hours') then
    return null;
  end if;

  insert into public.audit_log (actor, action, target, payload)
  values ('system:anti-abuse', 'abuse_cancel_ratio_alert', 'user:' || new.user_id,
          jsonb_build_object('ratio', v_ratio, 'canceled', v_canceled, 'sample', v_total,
                             'window', v_window, 'threshold', v_threshold, 'order_id', new.id));
  return null;
end;
$$;

create trigger orders_guard_insert
  before insert on public.orders
  for each row execute function public.orders_guard_insert();

create trigger orders_guard_status
  before update on public.orders
  for each row execute function public.orders_guard_status();

create trigger orders_cancel_ratio_alert
  after update of status on public.orders
  for each row
  when (new.status = 'canceled' and old.status is distinct from 'canceled' and new.canceled_by = 'user')
  execute function public.orders_cancel_ratio_alert();

revoke execute on function public.orders_guard_insert() from public, anon, authenticated;
revoke execute on function public.orders_guard_status() from public, anon, authenticated;
revoke execute on function public.orders_cancel_ratio_alert() from public, anon, authenticated;

-- =========================================================================
-- Jeton d'appel des tâches planifiées (lu par pg_cron et par l'Edge Function, jamais exposé)
-- =========================================================================

create table public.cron_tokens (
  name text primary key,
  token text not null,
  created_at timestamptz not null default now()
);
alter table public.cron_tokens enable row level security;
revoke all on public.cron_tokens from anon, authenticated;

insert into public.cron_tokens (name, token)
values ('reconcile', encode(extensions.gen_random_bytes(32), 'hex'));
